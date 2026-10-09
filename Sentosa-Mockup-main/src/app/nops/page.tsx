"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  NOPApplication,
  loadStoredNops,
  fetchNopsFromMongo,
  saveStoredNops,
  STATUTORY_TRIGGERS_LIST,
  getShortTriggerName,
  derivePermitStatus,
  isWorkAuthorized,
  getRequiredDocumentsSchedule,
  CONTRACTOR_PERSONAS
} from "@/lib/nopData";
import { useRole } from "@/context/RoleContext";
import { hasNopPermission, canAccessNopRecord } from "@/lib/nopPermissions";
import { getUsers } from "@/lib/users";
import {
  IconZap,
  IconCheckCircle,
  IconClock,
  IconAlertTriangle,
  IconAlertOctagon,
  IconBan,
  IconShieldCheck,
  IconFileText,
  IconClipboardCheck,
  IconMap,
  IconMapPin,
  IconAward,
  IconSearch,
  IconArrowRight,
  IconPlus,
  IconDownload,
  IconX
} from "@/components/NopIcons";

import * as XLSX from "xlsx";
import { NopCertificate } from "@/components/NopCertificate";
import { NopStatusBadge } from "@/components/NopStatusBadge";

function escapeHtml(str?: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeFormula(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function formatDateRange(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sDay = s.getUTCDate();
    const sMonth = months[s.getUTCMonth()];
    const sYear = s.getUTCFullYear();
    const eDay = e.getUTCDate();
    const eMonth = months[e.getUTCMonth()];
    const eYear = e.getUTCFullYear();
    if (sYear === eYear) {
      if (sMonth === eMonth) {
        return `${sDay} – ${eDay} ${sMonth} ${sYear}`;
      }
      return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${sYear}`;
    }
    return `${sDay} ${sMonth} ${sYear} – ${eDay} ${eMonth} ${eYear}`;
  } catch {
    return `${start.substring(0, 10)} → ${end.substring(0, 10)}`;
  }
}

function NopsCentralRegistryInner() {
  const { role, username, approverDept } = useRole();
  const currentUser = useMemo(() => {
    const byName = getUsers().find((u) => u.name === username || u.username === username);
    if (byName) return byName;
    return getUsers().find((u) => u.role === role);
  }, [username, role]);

  const effectiveCompany = useMemo(() => {
    const persona = CONTRACTOR_PERSONAS.find((p) => p.username === username);
    return persona?.company || currentUser?.company;
  }, [username, currentUser]);

  const isViewerRole = [
    "Responder (Ranger)",
    "Duty Officer",
    "Controller",
    "NOP Business Owner",
    "SDC Stakeholder / Operational Viewer (incl. OR Team)"
  ].includes(role);

  const isOrTeam = currentUser?.department?.toLowerCase().includes("resilience") || currentUser?.name?.toLowerCase().includes("audrey") || currentUser?.title?.toLowerCase().includes("resilience") || (currentUser as any)?.isOrTeam;
  const canExportData = role === "NOP Operations Admin" || (role.includes("SDC Stakeholder") && Boolean(isOrTeam));
  const isInternalRole = role !== "Applicant (Contractor)" && role !== "Stakeholder Manager";
  const canApplyPermit = (role === "Applicant (Contractor)" || (role === "Stakeholder Manager" && currentUser?.canActAsApplicant !== false)) && hasNopPermission(role, "nop.apply");

  const searchParams = useSearchParams();
  const router = useRouter();
  const [nops, setNops] = useState<NOPApplication[]>([]);
  const [mainView, setMainView] = useState<"register" | "analytics">("register");

  // Tab State
  const [applicationTab, setApplicationTab] = useState<"my" | "all">("my");
  
  const isAllowedToViewAll = [
    "System Administrator",
    "NOP Operations Admin",
    "Duty Manager",
    "SDC Stakeholder / Operational Viewer (incl. OR Team)",
    "Responder (Ranger)",
    "Duty Officer",
    "Controller",
    "NOP Business Owner"
  ].includes(role);

  useEffect(() => {
    if (!isAllowedToViewAll && applicationTab === "all") setApplicationTab("my");
  }, [role, isAllowedToViewAll, applicationTab]);



  // Search and Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTrigger, setFilterTrigger] = useState("");
  const [filterPermitStatus, setFilterPermitStatus] = useState("");
  const [filterDocuments, setFilterDocuments] = useState("");
  const [cardFilter, setCardFilter] = useState<"all" | "active" | "ipa" | "overdue" | "pending" | "urgent">("all");
  const [showExportModal, setShowExportModal] = useState(false);

  // Modals
  // NOP detail viewing/actions now live at /nops/[...id] (see that page for
  // extension/suspension/upload/revoke/cancel handlers and dossier tabs).
  const [showCertificateModal, setShowCertificateModal] = useState<NOPApplication | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Sorting state for table ( / TS09-02)
  const [sortCol, setSortCol] = useState<string>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTrigger, filterPermitStatus, filterDocuments, sortCol, sortDir, applicationTab]);

  // Keyboard accessibility: Escape key closes all open modals (TS11-02)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCertificateModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const data = loadStoredNops();
    setNops(data);

    // NOP detail viewing now lives at /nops/[...id]; a highlight deep-link
    // navigates straight there instead of opening the old dossier modal.
    const highlightId = searchParams.get("highlight");
    if (highlightId) {
      const target = data.find((n) => n.id.toLowerCase() === highlightId.toLowerCase());
      if (target) {
        router.push(`/nops/${target.id}`);
      }
    }
  }, [searchParams]);

  // Removed Contractor Portal redirect: Contractor and Stakeholder Manager now use the same unified Register.



  // User-scoped NOP list (before search & filter dropdowns)
  const scopedNops = useMemo(() => {
    return nops.filter((item) => {
      // FRD §2, §4.5, §7: Unsubmitted drafts must NOT appear in the NOP Central Register for any user.
      if (item.applicationStatus === "Draft") return false;

      // Scope records for all roles via canAccessNopRecord
      return canAccessNopRecord({
        role,
        username,
        email: currentUser?.email,
        companyName: effectiveCompany,
        canActAsApplicant: currentUser?.canActAsApplicant,
        approverDept
      }, item);
    });
  }, [nops, role, username, currentUser, effectiveCompany, approverDept]);

  // Base NOP dataset for user, respecting "My applications" vs "All applications"
  const baseNopsForUser = useMemo(() => {
    if (applicationTab === "my" && isAllowedToViewAll) {
      const u = (username || "").toLowerCase();
      const e = (currentUser?.email || "").toLowerCase();
      return scopedNops.filter((item) => {
        const lo = (item.sdcLiaisonOfficer || "").toLowerCase();
        let match = false;
        if (u && (lo.includes(u) || u.includes(lo))) match = true;
        if (e && lo.includes(e)) match = true;

        if (u && item.domainApprovals) {
          if (item.domainApprovals.some(da => 
            (da.approverName && da.approverName.toLowerCase().includes(u)) ||
            (da.approverRole && da.approverRole.toLowerCase().includes(u)) ||
            (da.domain && u.includes(da.domain.toLowerCase()))
          )) {
            match = true;
          }
        }

        if (item.creatorUsername && item.creatorUsername.toLowerCase() === u) match = true;
        if (e && item.creatorEmail && item.creatorEmail.toLowerCase() === e) match = true;

        return match;
      });
    }
    return scopedNops;
  }, [scopedNops, applicationTab, isAllowedToViewAll, username, currentUser]);

  // Action Required calculation tailored to user role and permissions
  const isPendingMyAction = useMemo(() => {
    return (item: NOPApplication): boolean => {
      // 1. Technical Approver:
      if (role === "Technical Approver") {
        const u = (username || "").toLowerCase();
        const dept = (approverDept || "").toLowerCase();
        // Pending Technical Clearance (only when Cleared for Approval by LO)
        const hasPendingDomainApproval =
          item.applicationStatus === "Under Review" &&
          item.loPreScreenStatus === "Cleared for Approval" &&
          (item.domainApprovals || []).some((da) => {
            if (da.status !== "Pending") return false;
            if (dept && dept !== "all") {
              if (da.departmentId && da.departmentId.toLowerCase() === dept) return true;
              if (da.domain && da.domain.toLowerCase().includes(dept)) return true;
              if (da.approverGroup && da.approverGroup.toLowerCase().includes(dept)) return true;
            }
            if (u) {
              if (da.approverName && da.approverName.toLowerCase().includes(u)) return true;
              if (da.approverRole && da.approverRole.toLowerCase().includes(u)) return true;
            }
            return !dept && !u;
          });

        // Pending Lifecycle Request Decision (Extension / Cancellation / Suspension Lifting)
        const hasPendingRequestDecision =
          (item.extensionRequests || []).some((r) => r.status === "Under Approver Review") ||
          item.cancellationRequest?.status === "Under Approver Review" ||
          item.liftingRequest?.status === "Under Approver Review";

        // Pending Deferred Document Review (post-IPA)
        const hasPendingDeferredDocs =
          item.ipaStatus === "Granted" &&
          (item.deferredDocuments || []).some((d) => d.status !== "Accepted");

        return Boolean(hasPendingDomainApproval || hasPendingRequestDecision || hasPendingDeferredDocs);
      }

      // 2. Liaison Officer:
      if (role === "Liaison Officer") {
        const u = (username || "").toLowerCase();
        const isAssignedLO = !item.sdcLiaisonOfficer || !u || item.sdcLiaisonOfficer.toLowerCase().includes(u);
        if (!isAssignedLO) return false;

        // Pending LO Pre-screening
        const hasPendingPrescreen =
          item.applicationStatus === "Under Review" &&
          (item.loPreScreenStatus === "Pending Pre-screening" || !item.loPreScreenStatus);

        // Pending Request Pre-screening
        const hasPendingRequestPrescreen =
          (item.extensionRequests || []).some((r) => r.status === "Pending Pre-screening") ||
          item.cancellationRequest?.status === "Pending Pre-screening" ||
          item.liftingRequest?.status === "Pending Pre-screening";

        return Boolean(hasPendingPrescreen || hasPendingRequestPrescreen);
      }

      // 3. Applicant (Contractor) / Stakeholder Manager:
      if (role === "Applicant (Contractor)" || role === "Stakeholder Manager") {
        // Change requested by SDC, awaiting contractor resubmission
        const hasChangeRequested = item.applicationStatus === "Change Requested";
        // Overdue compliance documents requiring contractor submission
        const hasOverdueDocs = item.documentCompletion === "Overdue";
        // Suspended permit requiring contractor rectification / lifting request
        const isSuspended = derivePermitStatus(item) === "Suspended" && !item.liftingRequest;

        return Boolean(hasChangeRequested || hasOverdueDocs || isSuspended);
      }

      // 4. NOP Operations Admin / System Administrator:
      if (role === "NOP Operations Admin" || role === "System Administrator") {
        const hasPendingLo =
          item.applicationStatus === "Under Review" &&
          (item.loPreScreenStatus === "Pending Pre-screening" || !item.loPreScreenStatus);
        const hasPendingApprovers =
          item.applicationStatus === "Under Review" &&
          item.loPreScreenStatus === "Cleared for Approval" &&
          (item.domainApprovals || []).some((da) => da.status === "Pending");
        const hasPendingReqs =
          (item.extensionRequests || []).some((r) => r.status.includes("Pending") || r.status.includes("Review")) ||
          (item.cancellationRequest && item.cancellationRequest.status !== "Approved" && item.cancellationRequest.status !== "Rejected") ||
          (item.liftingRequest && item.liftingRequest.status !== "Approved" && item.liftingRequest.status !== "Rejected");
        const hasChangeReq = item.applicationStatus === "Change Requested";
        return Boolean(hasPendingLo || hasPendingApprovers || hasPendingReqs || hasChangeReq);
      }

      // 5. Duty Manager:
      if (role === "Duty Manager") {
        const isUrgentOrIpa = item.ipaStatus === "Pending" || (item.isUrgent && item.applicationStatus === "Under Review");
        const hasPendingReq =
          item.cancellationRequest?.status === "Under Approver Review" ||
          item.liftingRequest?.status === "Under Approver Review";
        return Boolean(isUrgentOrIpa || hasPendingReq);
      }

      // 6. Viewers:
      return item.isUrgent;
    };
  }, [role, username, approverDept]);

  // Filtered NOP List with search and filter dropdowns
  const filteredNops = useMemo(() => {
    return baseNopsForUser.filter((item) => {
      const derived = derivePermitStatus(item);

      // Text Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          item.id.toLowerCase().includes(q) ||
          item.companyName.toLowerCase().includes(q) ||
          (item.companyUen && item.companyUen.toLowerCase().includes(q)) ||
          item.applicantName.toLowerCase().includes(q) ||
          item.workDescription.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          (item.unitRoomNumber && item.unitRoomNumber.toLowerCase().includes(q)) ||
          (item.spaceDescription && item.spaceDescription.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Trigger Filter
      if (filterTrigger && !item.triggers.some((t) => t.toLowerCase().includes(filterTrigger.toLowerCase()))) {
        return false;
      }

      // Status Filter (REG-02: Application Statuses vs Approved Permit Statuses)
      if (filterPermitStatus) {
        if (filterPermitStatus === "Withdrawn") {
          if (item.applicationStatus !== "Withdrawn") return false;
        } else if (filterPermitStatus === "Under Review") {
          if (item.applicationStatus !== "Under Review") return false;
        } else if (filterPermitStatus === "Change Requested") {
          if (item.applicationStatus !== "Change Requested") return false;
        } else {
          // Permit status filter (Upcoming, Active, Suspended, Expired, Cancelled, Revoked)
          // Only applies to Approved applications (or explicitly Cancelled / Revoked permits)
          if (item.applicationStatus !== "Approved" && item.permitStatus !== "Cancelled" && item.permitStatus !== "Revoked") {
            return false;
          }
          if (derived !== filterPermitStatus) return false;
        }
      }

      // Documents Filter (REG-01: matches documentCompletion)
      if (filterDocuments && item.documentCompletion !== filterDocuments) {
        return false;
      }

      return true;
    });
  }, [baseNopsForUser, searchTerm, filterTrigger, filterPermitStatus, filterDocuments]);

  // Sorted list for table view ( / TS09-02)
  const totalEligibleNops = useMemo(() => {
    return baseNopsForUser.length;
  }, [baseNopsForUser]);

  const sortedNops = useMemo(() => {
    let list = [...filteredNops];

    if (cardFilter === "active") list = list.filter(item => derivePermitStatus(item) === "Active" && isWorkAuthorized(item).allowed);
    if (cardFilter === "ipa") list = list.filter(item => item.ipaStatus === "Granted");
    if (cardFilter === "overdue") list = list.filter(item => item.documentCompletion === "Overdue");
    if (cardFilter === "pending") {
      list = list.filter((item) => {
        if (isViewerRole) return item.isUrgent;
        return isPendingMyAction(item);
      });
    }
    if (cardFilter === "urgent") list = list.filter(item => item.isUrgent);

    list.sort((a, b) => {
      let valA: string = (a as any)[sortCol] || "";
      let valB: string = (b as any)[sortCol] || "";
      if (sortCol === "permitStatus") {
        valA = derivePermitStatus(a);
        valB = derivePermitStatus(b);
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredNops, sortCol, sortDir, cardFilter, isViewerRole, isPendingMyAction]);

  // Operational KPI Analytics Calculations (🅑 BA Proposal P2.10)
  const analyticsData = useMemo(() => {
    const list = baseNopsForUser;
    const total = list.length || 1;
    const approvedNops = list.filter((n) => n.applicationStatus === "Approved");
    const urgentCount = list.filter((n) => n.isUrgent).length;
    const changeReqCount = list.filter((n) => n.applicationStatus === "Change Requested").length;
    const overdueCount = list.filter((n) => n.documentCompletion === "Overdue").length;
    const loClearedCount = list.filter((n) => n.loPreScreenStatus === "Cleared for Approval").length;
    const totalLoReviewed = list.filter((n) => n.loPreScreenStatus && n.loPreScreenStatus !== "Pending Pre-screening").length || 1;
    const suspendedCount = list.filter((n) => derivePermitStatus(n) === "Suspended" || n.permitStatus === "Suspended").length;

    // Average clearance turnaround in hours
    const turnaroundTimes = list.flatMap((n) =>
      (n.domainApprovals || [])
        .filter((a) => a.status === "Approved" && a.decidedAt)
        .map((a) => {
          const s = new Date(n.submittedAt || n.createdAt || 0).getTime();
          const d = new Date(a.decidedAt!).getTime();
          const diff = (d - s) / (1000 * 60 * 60);
          return isNaN(diff) || diff < 0 ? null : diff;
        })
        .filter((d): d is number => d !== null)
    );
    const avgTurnaroundHours = turnaroundTimes.length > 0
      ? (turnaroundTimes.reduce((a, b) => a + b, 0) / turnaroundTimes.length).toFixed(1)
      : "—";

    return {
      totalApplications: list.length,
      approvedRate: Math.round((approvedNops.length / total) * 100),
      avgTurnaroundHours,
      urgentRatio: Math.round((urgentCount / total) * 100),
      changeRequestRate: Math.round((changeReqCount / total) * 100),
      overdueDocumentsCount: overdueCount,
      loPreScreenPassRate: Math.round((loClearedCount / totalLoReviewed) * 100),
      suspensionIncidents: suspendedCount
    };
  }, [baseNopsForUser]);

  // Handlers

  // T36: Genuine XLSX Export for OR Team & Operations Admin
  const handleExportXlsx = () => {
    const canSeeContacts = role === "NOP Operations Admin" || role === "System Administrator";
    const data = sortedNops.map((n) => {
      const derived = derivePermitStatus(n);
      const row: Record<string, string> = {
        "Permit Reference": sanitizeFormula(n.id),
        "Company Name": sanitizeFormula(n.companyName),
        "UEN": sanitizeFormula(n.companyUen),
        "Work Description": sanitizeFormula(n.workDescription),
        "Duration Category": sanitizeFormula(n.durationCategory),
        "Location": sanitizeFormula(n.location),
        "Precinct Zone": sanitizeFormula(n.zone),
        "Start Date": sanitizeFormula(n.startDateTime?.substring(0, 10) || ""),
        "End Date": sanitizeFormula(n.endDateTime?.substring(0, 10) || ""),
        "Working Hours": sanitizeFormula(n.workingHours || ""),
        "Application Status": sanitizeFormula(n.applicationStatus),
        "Permit Status": sanitizeFormula(derived),
        "IPA Status": sanitizeFormula(n.ipaStatus || ""),
        "Document Status": sanitizeFormula(n.documentCompletion || ""),
        "Document Deadline": sanitizeFormula(n.documentDeadline ? n.documentDeadline.replace("T", " ").substring(0, 16) : "N/A"),
        "Statutory Triggers": sanitizeFormula((n.triggers || []).join("; ")),
        "Liaison Officer": sanitizeFormula(n.sdcLiaisonOfficer || ""),
        "Submission Date": sanitizeFormula(n.submittedAt || "")
      };
      if (canSeeContacts) {
        row["Applicant PIC"] = sanitizeFormula(n.applicantName);
        row["Contact Phone"] = sanitizeFormula(n.applicantPhone);
        row["Contact Email"] = sanitizeFormula(n.applicantEmail);
      }
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "NOP Central Register");
    XLSX.writeFile(workbook, `SDC_NOP_Registry_Export_${new Date().toISOString().substring(0, 10)}.xlsx`);
    showFeedback("XLSX Registry dataset exported successfully.");
  };

  // TS09-03 & REG-06: Unified CSV Export
  const handleExportCsv = () => {
    const canSeeContacts = role === "NOP Operations Admin" || role === "System Administrator";
    const headers = [
      "Permit Reference",
      "Company Name",
      "UEN",
      ...(canSeeContacts ? ["Applicant PIC", "Contact Phone", "Contact Email"] : []),
      "Work Description",
      "Duration Category",
      "Location",
      "Precinct Zone",
      "Start Date",
      "End Date",
      "Working Hours",
      "Application Status",
      "Permit Status",
      "IPA Status",
      "Document Status",
      "Document Deadline",
      "Statutory Triggers",
      "Liaison Officer",
      "Submitted At"
    ];
    const rows = sortedNops.map((n) => {
      const derived = derivePermitStatus(n);
      const cols = [
        `"${sanitizeFormula(n.id)}"`,
        `"${sanitizeFormula(n.companyName || "").replace(/"/g, '""')}"`,
        `"${sanitizeFormula(n.companyUen || "")}"`,
        ...(canSeeContacts ? [
          `"${sanitizeFormula(n.applicantName || "").replace(/"/g, '""')}"`,
          `"${sanitizeFormula(n.applicantPhone || "").replace(/"/g, '""')}"`,
          `"${sanitizeFormula(n.applicantEmail || "").replace(/"/g, '""')}"`
        ] : []),
        `"${sanitizeFormula(n.workDescription || "").replace(/"/g, '""')}"`,
        `"${sanitizeFormula(n.durationCategory || "")}"`,
        `"${sanitizeFormula(n.location || "").replace(/"/g, '""')}"`,
        `"${sanitizeFormula(n.zone || "")}"`,
        `"${sanitizeFormula(n.startDateTime?.substring(0, 10) || "")}"`,
        `"${sanitizeFormula(n.endDateTime?.substring(0, 10) || "")}"`,
        `"${sanitizeFormula(n.workingHours || "")}"`,
        `"${sanitizeFormula(n.applicationStatus || "")}"`,
        `"${sanitizeFormula(derived)}"`,
        `"${sanitizeFormula(n.ipaStatus || "")}"`,
        `"${sanitizeFormula(n.documentCompletion || "")}"`,
        `"${sanitizeFormula(n.documentDeadline ? n.documentDeadline.replace("T", " ").substring(0, 16) : "N/A")}"`,
        `"${sanitizeFormula((n.triggers || []).join("; ")).replace(/"/g, '""')}"`,
        `"${sanitizeFormula(n.sdcLiaisonOfficer || "").replace(/"/g, '""')}"`,
        `"${sanitizeFormula(n.submittedAt || "")}"`
      ];
      return cols.join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SDC_NOP_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showFeedback("CSV dataset exported successfully.");
  };

  // REG-16: Unified PDF Export
  const handleExportPdf = () => {
    const printableWindow = window.open("", "_blank");
    if (!printableWindow) return;
    const rows = sortedNops.map((n) => {
      const derived = derivePermitStatus(n);
      return `
        <tr>
          <td style="padding: 6px; border: 1px solid #CBD5E1; font-family: monospace; font-weight: bold;">${escapeHtml(n.id)}</td>
          <td style="padding: 6px; border: 1px solid #CBD5E1;"><strong>${escapeHtml(n.companyName)}</strong><br/><span style="color:#64748B; font-size: 11px;">${escapeHtml(n.workDescription)}</span></td>
          <td style="padding: 6px; border: 1px solid #CBD5E1;">${escapeHtml(n.location)} (${escapeHtml(n.zone)})</td>
          <td style="padding: 6px; border: 1px solid #CBD5E1;">${escapeHtml(n.startDateTime?.substring(0, 10))} → ${escapeHtml(n.endDateTime?.substring(0, 10))}</td>
          <td style="padding: 6px; border: 1px solid #CBD5E1; font-weight: bold;">${escapeHtml(n.applicationStatus)} / ${escapeHtml(derived)}</td>
          <td style="padding: 6px; border: 1px solid #CBD5E1;">${escapeHtml(n.documentCompletion)}</td>
          <td style="padding: 6px; border: 1px solid #CBD5E1;">${escapeHtml(n.sdcLiaisonOfficer)}</td>
        </tr>
      `;
    }).join("");

    printableWindow.document.write(`
      <html>
        <head>
          <title>SDC NOP Central Register Report</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #1E293B; }
            h2 { margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 16px; }
            th { background: #F8FAFC; text-align: left; padding: 8px 6px; border: 1px solid #CBD5E1; }
          </style>
        </head>
        <body>
          <h2>SDC Notice of Project (NOP) — Official Register Report</h2>
          <p style="color: #64748B; font-size: 12px; margin-top: 2px;">Generated on ${new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} SGT &bull; Total records: ${sortedNops.length}</p>
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Company &amp; Work Scope</th>
                <th>Location</th>
                <th>Validity (SGT)</th>
                <th>Status (App / Permit)</th>
                <th>Documents</th>
                <th>Liaison Officer</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printableWindow.document.close();
    printableWindow.focus();
    setTimeout(() => {
      printableWindow.print();
    }, 500);
    showFeedback("PDF Summary report generated.");
  };

  return (
    <div>
      {/* Top Header (P0.1: No Objection Permit) */}
      <div className="page-header-bar glass" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div className="title-section">
          <h1 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-main)", margin: "4px 0" }}>
            No Objection Permit (NOP) — Official Register
          </h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
            Central statutory register managing island work permits, engineering clearances, and contractor compliance across Sentosa Island.
          </p>
        </div>

        {(role === 'NOP Operations Admin' || role === 'NOP Business Owner' || role === 'System Administrator' || role === 'Current Ops Administrator') && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link
              href="/admin/nop-config"
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: "12.5px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 14px",
                background: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                color: "#1E293B",
                textDecoration: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              <span>NOP Configuration</span>
              {role === 'NOP Business Owner' && (
                <span style={{ fontSize: '10px', background: '#F1F5F9', color: '#64748B', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                  Read-Only
                </span>
              )}
            </Link>
          </div>
        )}
      </div>

      {/* Main Mode Toggle: Register vs Analytics */}
      <div className="glass" style={{ padding: "0 20px", display: "flex", alignItems: "flex-end", gap: 0, background: "var(--bg-card)", borderBottom: "1px solid var(--border-color)", marginBottom: "22px" }}>
        <button
          onClick={() => setMainView("register")}
          style={{
            background: "transparent",
            border: "none",
            borderBottom: mainView === "register" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: mainView === "register" ? "var(--color-primary)" : "var(--text-muted)",
            padding: "14px 20px",
            fontSize: "13px",
            fontWeight: mainView === "register" ? 700 : 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap"
          }}
        >
          <IconClipboardCheck size={15} />
          <span>NOP Register</span>
          <span
            style={{
              background: mainView === "register" ? "var(--color-primary)" : "#E2E8F0",
              color: mainView === "register" ? "#FFFFFF" : "#0F172A",
              padding: "2px 7px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 800
            }}
          >
            {filteredNops.length}
          </span>
        </button>

        <button
          onClick={() => setMainView("analytics")}
          style={{
            background: "transparent",
            border: "none",
            borderBottom: mainView === "analytics" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: mainView === "analytics" ? "var(--color-primary)" : "var(--text-muted)",
            padding: "14px 20px",
            fontSize: "13px",
            fontWeight: mainView === "analytics" ? 700 : 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap"
          }}
        >
          <IconClock size={15} />
          <span>NOP Analytics (6 Operational KPIs)</span>
        </button>
      </div>


      {/* ================= VIEW 1: CENTRAL REGISTER ================= */}
      {mainView === "register" && (
        <>
          {/* KPI Summary Cards Banner */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "22px" }}>
            {/* Block 1: Active Permits On-Site (P0.3) */}
            <div
              className="stat-card"
              onClick={() => setCardFilter(cardFilter === "active" ? "all" : "active")}
              style={{
                cursor: "pointer",
                background: "#FFFFFF",
                border: cardFilter === "active" ? "1.5px solid #10B981" : "1px solid var(--border-color)",
                boxShadow: cardFilter === "active" ? "0 0 0 3px rgba(16, 185, 129, 0.15)" : undefined
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3.5px", background: "#10B981" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Active Permits On-Site
                </span>
                <span style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.12)", color: "#047857", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconCheckCircle size={16} strokeWidth={2.2} />
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
                <span style={{ fontSize: "28px", fontWeight: 800, color: "#10B981", letterSpacing: "-0.03em", fontFamily: "var(--font-headline)" }}>
                  {baseNopsForUser.filter((n) => derivePermitStatus(n) === "Active" && isWorkAuthorized(n).allowed).length}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-sub)" }}>Active on Site</span>
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
                Calculated dynamically from validity dates
              </div>
            </div>

            {/* Block 2: In-Principle Approvals (IPA) */}
            <div
              className="stat-card"
              onClick={() => setCardFilter(cardFilter === "ipa" ? "all" : "ipa")}
              style={{
                cursor: "pointer",
                background: "#FFFFFF",
                border: cardFilter === "ipa" ? "1.5px solid #00747C" : "1px solid var(--border-color)",
                boxShadow: cardFilter === "ipa" ? "0 0 0 3px rgba(0, 116, 124, 0.15)" : undefined
              }}
              title="In-Principle Approvals"
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3.5px", background: "#00747C" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  In-Principle Approvals
                </span>
                <span style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(0, 140, 149, 0.12)", color: "#00747C", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconClipboardCheck size={16} strokeWidth={2.2} />
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
                <span style={{ fontSize: "28px", fontWeight: 800, color: "#00747C", letterSpacing: "-0.03em", fontFamily: "var(--font-headline)" }}>
                  {baseNopsForUser.filter((n) => n.ipaStatus === "Granted").length}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-sub)" }}>Granted (IPA)</span>
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00747C", display: "inline-block" }} />
                Preparatory works authorized under conditional SLA
              </div>
            </div>

            {/* Block 3: Document SLA Gate */}
            <div
              className="stat-card"
              onClick={() => setCardFilter(cardFilter === "overdue" ? "all" : "overdue")}
              style={{
                cursor: "pointer",
                background: "#FFFFFF",
                border: cardFilter === "overdue" ? "1.5px solid #EF4444" : "1px solid var(--border-color)",
                boxShadow: cardFilter === "overdue" ? "0 0 0 3px rgba(239, 68, 68, 0.15)" : undefined
              }}
              title="Overdue Documents"
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3.5px", background: "#EF4444" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Document SLA Gate
                </span>
                <span style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.12)", color: "#B91C1C", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconAlertTriangle size={16} strokeWidth={2.2} />
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
                <span style={{ fontSize: "28px", fontWeight: 800, color: "#EF4444", letterSpacing: "-0.03em", fontFamily: "var(--font-headline)" }}>
                  {baseNopsForUser.filter((n) => n.documentCompletion === "Overdue").length}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-sub)" }}>Overdue</span>
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#EF4444", display: "inline-block" }} />
                Pending critical safety submissions
              </div>
            </div>

            {/* Block 4: Action Required (Role-Scoped) or Urgent Submissions (For Operational Viewers) */}
            {!isViewerRole ? (
              <div
                className="stat-card"
                onClick={() => setCardFilter(cardFilter === "pending" ? "all" : "pending")}
                style={{
                  cursor: "pointer",
                  background: "#FFFFFF",
                  border: cardFilter === "pending" ? "1.5px solid #F59E0B" : "1px solid var(--border-color)",
                  boxShadow: cardFilter === "pending" ? "0 0 0 3px rgba(245, 158, 11, 0.15)" : undefined
                }}
                title="Action Required"
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3.5px", background: "#F59E0B" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Action Required
                  </span>
                  <span style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.12)", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconAlertOctagon size={16} strokeWidth={2.2} />
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
                  <span style={{ fontSize: "28px", fontWeight: 800, color: "#F59E0B", letterSpacing: "-0.03em", fontFamily: "var(--font-headline)" }}>
                    {baseNopsForUser.filter(isPendingMyAction).length}
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-sub)" }}>
                    {role === "Technical Approver"
                      ? "Pending Endorsement"
                      : role === "Liaison Officer"
                      ? "Pending Pre-screening"
                      : role === "Applicant (Contractor)" || role === "Stakeholder Manager"
                      ? "Resubmission / Overdue"
                      : role === "Duty Manager"
                      ? "Urgent / IPA Queue"
                      : "Pending SDC Action"}
                  </span>
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#F59E0B", display: "inline-block" }} />
                  {role === "Technical Approver"
                    ? "Pending your technical endorsement or request decision"
                    : role === "Liaison Officer"
                    ? "Pending your initial pre-screening clearance"
                    : role === "Applicant (Contractor)" || role === "Stakeholder Manager"
                    ? "Awaiting your resubmission or overdue compliance docs"
                    : role === "Duty Manager"
                    ? "Awaiting Duty Manager IPA or urgent intervention"
                    : "Island-wide applications awaiting LO or Approver clearance"}
                </div>
              </div>
            ) : (
              <div
                className="stat-card"
                onClick={() => setCardFilter(cardFilter === "urgent" ? "all" : "urgent")}
                style={{
                  cursor: "pointer",
                  background: "#FFFFFF",
                  border: cardFilter === "urgent" ? "1.5px solid #FF8200" : "1px solid var(--border-color)",
                  boxShadow: cardFilter === "urgent" ? "0 0 0 3px rgba(255, 130, 0, 0.15)" : undefined
                }}
                title="Urgent Submissions"
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3.5px", background: "#FF8200" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Urgent Submissions
                  </span>
                  <span style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(255, 130, 0, 0.12)", color: "#FF8200", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconZap size={16} strokeWidth={2.2} />
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
                  <span style={{ fontSize: "28px", fontWeight: 800, color: "#FF8200", letterSpacing: "-0.03em", fontFamily: "var(--font-headline)" }}>
                    {baseNopsForUser.filter((n) => n.isUrgent).length}
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-sub)" }}>Urgent (&lt; 7d)</span>
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#FF8200", display: "inline-block" }} />
                  Submitted less than 7 days ahead
                </div>
              </div>
            )}
          </div>

          {/* Tabs for My / All Applications */}
          {isAllowedToViewAll && (
            <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid var(--border-color)", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={() => setApplicationTab("my")}
                style={{
                  padding: "12px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: applicationTab === "my" ? "2px solid #0F766E" : "2px solid transparent",
                  color: applicationTab === "my" ? "#0F766E" : "var(--text-muted)",
                  fontWeight: applicationTab === "my" ? 700 : 500,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                My applications
              </button>
              <button
                type="button"
                onClick={() => setApplicationTab("all")}
                style={{
                  padding: "12px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: applicationTab === "all" ? "2px solid #0F766E" : "2px solid transparent",
                  color: applicationTab === "all" ? "#0F766E" : "var(--text-muted)",
                  fontWeight: applicationTab === "all" ? 700 : 500,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                All applications
              </button>
            </div>
          )}
          {!isAllowedToViewAll && (
            <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-main)", marginBottom: "16px" }}>
              My applications
            </div>
          )}



          {/* Filter and Search Bar */}
          <div className="card" style={{ padding: "12px 16px", marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", background: "#FFFFFF", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <div style={{ flex: 1.6, minWidth: "240px", position: "relative" }}>
              <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none", display: "flex", alignItems: "center" }}>
                <IconSearch size={14} strokeWidth={2} />
              </div>
              <input type="text" aria-label="Search NOP ID, Company, UEN, PIC, Unit or Scope" placeholder="Search NOP ID, Company, UEN, PIC, Unit or Scope..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control"
                style={{ width: "100%", fontSize: "12.5px", paddingLeft: "32px", borderRadius: "6px" }}
              />
            </div>

            <div style={{ width: "170px" }}>
              <select
                aria-label="Filter by Application Status"
                value={filterPermitStatus}
                onChange={(e) => setFilterPermitStatus(e.target.value)}
                className="form-control select-dark"
                style={{ width: "100%", fontSize: "12px", borderRadius: "6px" }}
              >
                <option value="">Application status</option>
                <option value="Under Review">Under review</option>
                <option value="Change Requested">Changes requested</option>
                <option value="Active">Active permit</option>
                <option value="Upcoming">Upcoming permit</option>
                <option value="Suspended">Suspended</option>
                <option value="Expired">Expired</option>
                <option value="Withdrawn">Withdrawn</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Revoked">Revoked</option>
              </select>
            </div>

            <div style={{ width: "160px" }}>
              <select
                aria-label="Filter by Documents"
                value={filterDocuments}
                onChange={(e) => setFilterDocuments(e.target.value)}
                className="form-control select-dark"
                style={{ width: "100%", fontSize: "12px", borderRadius: "6px" }}
              >
                <option value="">Documents</option>
                <option value="Documents Complete">Documents complete</option>
                <option value="Documents Outstanding">Documents outstanding</option>
                <option value="Overdue">Documents overdue</option>
              </select>
            </div>



            {(searchTerm || filterTrigger || filterDocuments || filterPermitStatus || cardFilter !== "all") && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchTerm("");
                  setFilterTrigger("");
                  setFilterDocuments("");
                  setFilterPermitStatus("");
                  setCardFilter("all");
                }}
                style={{ fontSize: "12px", color: "#2563EB", background: "transparent", border: "none", padding: "4px 8px", cursor: "pointer", fontWeight: 600 }}
              >
                Clear all
              </button>
            )}

            <div style={{ display: "flex", gap: "8px", marginLeft: "auto", alignItems: "center" }}>
              {(hasNopPermission(role, "nop.export_pdf") || (canExportData && hasNopPermission(role, "nop.export_xlsx"))) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowExportModal(true)}
                  style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 12px" }}
                >
                  <IconDownload size={14} />
                  <span>Export</span>
                </button>
              )}
              {canApplyPermit && (
                <Link
                  href="/nops/new"
                  className="btn btn-primary btn-sm"
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    background: "#FF8200",
                    color: "#FFFFFF",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px"
                  }}
                >
                  <IconPlus size={13} />
                  <span>Apply for Permit</span>
                </Link>
              )}
            </div>
          </div>

          {/* Main Central Registry Data Grid */}
          <div className="card" style={{ padding: 0, border: "1px solid var(--border-color)", borderRadius: "8px", background: "var(--bg-card)", overflow: "hidden" }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid var(--border-color)", background: "#FFFFFF" }}>
              <span style={{ fontSize: "12.5px", color: "var(--text-sub)", fontWeight: 500 }}>
                Showing <strong>{sortedNops.length}</strong> applications
              </span>
            </div>
            <div className="table-container" style={{ overflowX: "auto" }}>
            <table className="custom-table" style={{ width: "100%", minWidth: "1180px" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border-color)" }}>
                  <th scope="col"
                    style={{ width: "220px", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "12px 16px" }}
                    role="button"
                    tabIndex={0}
                    aria-sort={sortCol === "id" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    onClick={() => handleSort("id")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSort("id"); }}
                  >
                    REFERENCE &amp; CONTRACTOR {sortCol === "id" ? (sortDir === "asc" ? "▲" : "▼") : "▾"}
                  </th>
                  <th scope="col"
                    style={{ minWidth: "360px", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "12px 16px" }}
                    role="button"
                    tabIndex={0}
                    aria-sort={sortCol === "workDescription" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    onClick={() => handleSort("workDescription")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSort("workDescription"); }}
                  >
                    WORK SCOPE &amp; LOCATION ⇳
                  </th>
                  <th scope="col"
                    style={{ width: "165px", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "12px 16px" }}
                    role="button"
                    tabIndex={0}
                    aria-sort={sortCol === "startDateTime" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    onClick={() => handleSort("startDateTime")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSort("startDateTime"); }}
                  >
                    SCHEDULE ⇳
                  </th>
                  <th scope="col"
                    style={{ width: "165px", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "12px 16px" }}
                    role="button"
                    tabIndex={0}
                    aria-sort={sortCol === "permitStatus" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    onClick={() => handleSort("permitStatus")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSort("permitStatus"); }}
                  >
                    APPLICATION STATUS ⇳
                  </th>
                  <th scope="col"
                    style={{ width: "165px", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "12px 16px" }}
                    role="button"
                    tabIndex={0}
                    aria-sort={sortCol === "loPreScreenStatus" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    onClick={() => handleSort("loPreScreenStatus")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSort("loPreScreenStatus"); }}
                  >
                    DOCUMENTS ⇳
                  </th>
                  <th scope="col" style={{ width: "230px", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "12px 16px" }}>
                    NEXT STEP ⇳
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedNops.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)" }}>
                      <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--bg-inset)", border: "1px solid var(--border-color)", margin: "0 auto 12px auto", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                        <IconSearch size={22} strokeWidth={1.8} />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-main)" }}>No NOP records match the selected filter criteria.</div>
                      <div style={{ fontSize: "12px", marginTop: "4px" }}>Try adjusting your search keyword or clearing the filters above.</div>
                    </td>
                  </tr>
                ) : (
                  (sortedNops.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)).map((nop) => {
                    const derivedStatus = derivePermitStatus(nop);

                    return (
                      <tr
                        key={nop.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/nops/${nop.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/nops/${nop.id}`);
                          }
                        }}
                        title="Click row to open full dossier page"
                        style={{ cursor: "pointer", borderBottom: "1px solid var(--border-color)" }}
                      >
                        {/* 1. Reference & Contractor */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#EA580C", fontSize: "12.5px" }}>
                            {nop.id}
                          </div>
                          <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "13px", marginTop: "2px", lineHeight: 1.3 }}>
                            {nop.companyName}
                          </div>
                          <div style={{ display: "flex", gap: "5px", marginTop: "6px", flexWrap: "wrap", alignItems: "center" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: "4px",
                                background: "#EFF6FF",
                                color: "#1E40AF",
                                border: "1px solid #DBEAFE",
                                textTransform: "uppercase",
                                letterSpacing: "0.02em"
                              }}
                            >
                              {nop.durationCategory === "BAU Maintenance" ? "BAU MAINTENANCE" : nop.durationCategory === "Ad-hoc Work" ? "AD-HOC WORK" : nop.durationCategory === "Project Work" ? "INFRASTRUCTURE WORKS" : "UTILITY WORKS"}
                            </span>
                          </div>
                        </td>

                        {/* 2. Scope & Location */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "13.5px", lineHeight: 1.35 }}>
                            {nop.workDescription}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", fontSize: "11.5px", color: "var(--text-muted)" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                              <IconMapPin size={11.5} color="#94A3B8" />
                              <span>{nop.location}</span>
                            </span>
                            <span>•</span>
                            <span style={{ color: "var(--text-sub)" }}>{nop.zone}</span>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "6px" }}>
                            {nop.triggers.slice(0, 2).map((t, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 500,
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  background: "#F8FAFC",
                                  border: "1px solid #E2E8F0",
                                  color: "#475569",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {getShortTriggerName(t)}
                              </span>
                            ))}
                            {nop.triggers.length > 2 && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 500,
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: "#F1F5F9",
                                  color: "#64748B",
                                  border: "1px solid #E2E8F0"
                                }}
                              >
                                +{nop.triggers.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Permitted Schedule */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>
                            {formatDateRange(nop.startDateTime, nop.endDateTime)}
                          </div>
                          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "3px" }}>
                            {nop.workingHours ? (nop.workingHours.includes("(Daily)") ? nop.workingHours : `${nop.workingHours} (Daily)`) : "08:00 – 18:00 (Daily)"}
                          </div>
                        </td>

                        {/* 4. Application Status */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, marginBottom: "3px" }}>
                            {nop.applicationStatus === "Approved" ? "Permit" : "Application"}
                          </div>
                          
                          {/* Status Pill Badge */}
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <NopStatusBadge nop={nop} size="md" />
                          </div>
                        </td>

                        {/* 5. Documents Column */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", whiteSpace: "nowrap" }}>
                            {nop.applicationStatus === "Draft" ? (
                              <span style={{ color: "#64748B", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                <IconFileText size={13} color="#64748B" style={{ flexShrink: 0 }} />
                                <span>Not submitted</span>
                              </span>
                            ) : nop.documentCompletion === "Documents Outstanding" || nop.documentCompletion === "Overdue" ? (
                              <span style={{ color: "#EA580C", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 500 }}>
                                <IconFileText size={13} color="#EA580C" style={{ flexShrink: 0 }} />
                                <span>Documents outstanding</span>
                                <span
                                  style={{
                                    width: "18px",
                                    height: "18px",
                                    minWidth: "18px",
                                    minHeight: "18px",
                                    maxWidth: "18px",
                                    maxHeight: "18px",
                                    borderRadius: "50%",
                                    background: "#DC2626",
                                    color: "#FFFFFF",
                                    fontSize: "10.5px",
                                    fontWeight: 800,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    lineHeight: 1,
                                    boxSizing: "border-box"
                                  }}
                                >
                                  {(() => {
                                    const sched = getRequiredDocumentsSchedule(nop);
                                    return sched.totalMissing + sched.totalOverdue || 1;
                                  })()}
                                </span>
                              </span>
                            ) : nop.domainApprovals && nop.domainApprovals.length > 0 ? (
                              <span style={{ color: "#475569", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                <IconFileText size={13} color="#64748B" style={{ flexShrink: 0 }} />
                                <span>{nop.domainApprovals.filter(a => a.status === "Approved").length} / {nop.domainApprovals.length} approvals</span>
                              </span>
                            ) : (
                              <span style={{ color: "#059669", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                <IconCheckCircle size={13} color="#059669" style={{ flexShrink: 0 }} />
                                <span>Complete</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Next Step & View Button Column */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                            <div>
                              {(() => {
                                if (nop.applicationStatus === "Withdrawn") {
                                  return (
                                    <>
                                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748B" }}>Application Withdrawn</div>
                                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>Process terminated</div>
                                    </>
                                  );
                                }
                                if (nop.permitStatus === "Cancelled" || nop.permitStatus === "Revoked") {
                                  return (
                                    <>
                                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#DC2626" }}>Permit {nop.permitStatus}</div>
                                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>Access revoked</div>
                                    </>
                                  );
                                }
                                if (nop.permitStatus === "Suspended") {
                                  return (
                                    <>
                                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#DC2626" }}>Work Suspended</div>
                                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>Pending rectification &amp; lifting</div>
                                    </>
                                  );
                                }
                                if (nop.applicationStatus === "Draft") {
                                  return (
                                    <>
                                      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-main)" }}>Not submitted</div>
                                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>Complete and submit application</div>
                                    </>
                                  );
                                }
                                if (nop.applicationStatus === "Change Requested") {
                                  return (
                                    <>
                                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#D97706" }}>Applicant revision required</div>
                                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>Address reviewer comments</div>
                                    </>
                                  );
                                }
                                if (nop.loPreScreenStatus === "Pending Pre-screening") {
                                  return (
                                    <>
                                      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-main)" }}>LO Pre-screening</div>
                                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>Awaiting Liaison Officer review</div>
                                    </>
                                  );
                                }
                                if (nop.applicationStatus === "Under Review") {
                                  const approvals = nop.domainApprovals || [];
                                  const approvedCount = approvals.filter(a => a.status === "Approved").length;

                                  return (
                                    <>
                                      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-main)" }}>
                                        {approvals.length > 0 ? `${approvedCount} / ${approvals.length} endorsements` : "Technical review"}
                                      </div>
                                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                                        Awaiting technical approvers
                                      </div>
                                    </>
                                  );
                                }
                                // Approved permits
                                if (nop.ipaStatus === "Granted" && nop.documentCompletion !== "Documents Complete") {
                                  const pendingDocsCount = (nop.deferredDocuments || nop.deferredDocumentSlots || []).filter((d: any) => d.status !== "Approved" && d.status !== "Accepted").length;
                                  return (
                                    <>
                                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#2563EB" }}>IPA Granted • Deferred Docs</div>
                                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>{pendingDocsCount} deferred documents pending</div>
                                    </>
                                  );
                                }
                                if (derivePermitStatus(nop) === "Upcoming") {
                                  return (
                                    <>
                                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>Permit Issued</div>
                                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>Commencement scheduled</div>
                                    </>
                                  );
                                }
                                if (derivePermitStatus(nop) === "Expired") {
                                  return (
                                    <>
                                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748B" }}>Permit Expired</div>
                                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>Validity window ended</div>
                                    </>
                                  );
                                }
                                return (
                                  <>
                                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>Authorized for site work</div>
                                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>Active validity window</div>
                                  </>
                                );
                              })()}
                            </div>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "4px 12px", fontSize: "11.5px", fontWeight: 600, color: "var(--text-main)", borderRadius: "6px", background: "#FFFFFF", border: "1px solid var(--border-color)", flexShrink: 0 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/nops/${nop.id}`);
                              }}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {sortedNops.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderTop: "1px solid var(--border-color)", background: "#F8FAFC", borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, sortedNops.length)}</strong> of <strong>{sortedNops.length}</strong> entries
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: "6px 12px", fontSize: "13px", fontWeight: 600, background: currentPage === 1 ? "#F1F5F9" : "#FFFFFF", color: currentPage === 1 ? "#94A3B8" : "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: "6px", cursor: currentPage === 1 ? "not-allowed" : "pointer", transition: "all 0.15s ease" }}
                  >
                    Previous
                  </button>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {Array.from({ length: Math.ceil(sortedNops.length / itemsPerPage) }).map((_, idx) => {
                      const page = idx + 1;
                      // Simple windowing
                      if (page === 1 || page === Math.ceil(sortedNops.length / itemsPerPage) || (page >= currentPage - 1 && page <= currentPage + 1)) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: currentPage === page ? 700 : 500, background: currentPage === page ? "var(--color-primary)" : "#FFFFFF", color: currentPage === page ? "#FFFFFF" : "var(--text-main)", border: currentPage === page ? "1px solid var(--color-primary)" : "1px solid var(--border-color)", borderRadius: "6px", cursor: "pointer", transition: "all 0.15s ease" }}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", color: "var(--text-muted)" }}>...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(sortedNops.length / itemsPerPage), p + 1))}
                    disabled={currentPage === Math.ceil(sortedNops.length / itemsPerPage)}
                    style={{ padding: "6px 12px", fontSize: "13px", fontWeight: 600, background: currentPage === Math.ceil(sortedNops.length / itemsPerPage) ? "#F1F5F9" : "#FFFFFF", color: currentPage === Math.ceil(sortedNops.length / itemsPerPage) ? "#94A3B8" : "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: "6px", cursor: currentPage === Math.ceil(sortedNops.length / itemsPerPage) ? "not-allowed" : "pointer", transition: "all 0.15s ease" }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </>
      )}

      {/* ================= VIEW 2: NOP ANALYTICS DASHBOARD (🅑 BA Proposal P2.10) ================= */}
      {mainView === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Header Banner */}
          <div style={{ background: "rgba(0, 140, 149, 0.06)", border: "1px solid rgba(0, 140, 149, 0.25)", padding: "14px 20px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#00747C", textTransform: "none" }}>
                NOP Institutional Operations &amp; Safety Resilience Dashboard
              </h3>
              <div style={{ fontSize: "12px", color: "var(--text-sub)", marginTop: "2px" }}>
                Operational metrics measuring end-to-end statutory review performance, bottleneck detection, and contractor compliance health across Sentosa Island.
              </div>
            </div>
          </div>

          {/* 6 Core KPI Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {/* KPI 1 */}
            <div className="stat-card" style={{ background: "#FFFFFF", padding: "18px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                1. Avg Submit-to-Approval Duration
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
                <span style={{ fontSize: "32px", fontWeight: 800, color: "#00747C", fontFamily: "var(--font-headline)" }}>
                  {analyticsData.avgTurnaroundHours}
                </span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-sub)" }}>Hours</span>
              </div>
              <div style={{ fontSize: "11.5px", color: "#15803D", marginTop: "4px" }}>
                &bull; Measured across all completed statutory review stages
              </div>
            </div>

            {/* KPI 2 */}
            <div className="stat-card" style={{ background: "#FFFFFF", padding: "18px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                2. Change Request Rate (Deficiency Rate)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
                <span style={{ fontSize: "32px", fontWeight: 800, color: "#F59E0B", fontFamily: "var(--font-headline)" }}>
                  {analyticsData.changeRequestRate}%
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-sub)" }}>of Submissions</span>
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Primary reason: Missing PE structural wind calculations &amp; TMP plans
              </div>
            </div>

            {/* KPI 3 */}
            <div className="stat-card" style={{ background: "#FFFFFF", padding: "18px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                3. Urgent Fast-Track Ratio (&lt; 7 Days Notice)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
                <span style={{ fontSize: "32px", fontWeight: 800, color: "#EF4444", fontFamily: "var(--font-headline)" }}>
                  {analyticsData.urgentRatio}%
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-sub)" }}>of Work Volume</span>
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Urgent: work start &lt;7 calendar days from submission (monitors fast-track classification)
              </div>
            </div>

            {/* KPI 4 */}
            <div className="stat-card" style={{ background: "#FFFFFF", padding: "18px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                4. Deferred Documents Overdue Gate
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
                <span style={{ fontSize: "32px", fontWeight: 800, color: analyticsData.overdueDocumentsCount > 0 ? "#B91C1C" : "#15803D", fontFamily: "var(--font-headline)" }}>
                  {analyticsData.overdueDocumentsCount}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-sub)" }}>Urgent NOPs có tài liệu quá hạn</span>
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Overdue required documents: statutory warnings &amp; reminders for deferred submissions
              </div>
            </div>

            {/* KPI 5 */}
            <div className="stat-card" style={{ background: "#FFFFFF", padding: "18px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                5. LO Pre-Screening Clearance Pass Rate
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
                <span style={{ fontSize: "32px", fontWeight: 800, color: "#0369A1", fontFamily: "var(--font-headline)" }}>
                  {analyticsData.loPreScreenPassRate}%
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-sub)" }}>First-Pass Ratio</span>
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Measures pre-screening gatekeeping efficiency before technical queues
              </div>
            </div>

            {/* KPI 6 */}
            <div className="stat-card" style={{ background: "#FFFFFF", padding: "18px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                6. Active Stop-Work / Suspensions
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
                <span style={{ fontSize: "32px", fontWeight: 800, color: "#7C3AED", fontFamily: "var(--font-headline)" }}>
                  {analyticsData.suspensionIncidents}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-sub)" }}>Site Orders</span>
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Tracked per safety non-compliance &amp; stop-work orders pursuant to safety enforcement policies
              </div>
            </div>
          </div>

          {/* Department Review Bottleneck Tracker */}
          <div className="card" style={{ padding: "20px" }}>
            <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 800 }}>
              Department Approver SLA Performance &amp; Clearance Backlog
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
              <div style={{ background: "var(--bg-inset)", padding: "12px", borderRadius: "8px" }}>
                <strong style={{ fontSize: "12px", color: "var(--text-main)" }}>Sentosa Express Track</strong>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#15803D", marginTop: "4px" }}>14.2h</div>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>0 Pending Clearances</div>
              </div>
              <div style={{ background: "var(--bg-inset)", padding: "12px", borderRadius: "8px" }}>
                <strong style={{ fontSize: "12px", color: "var(--text-main)" }}>Traffic &amp; Road Closure</strong>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#F59E0B", marginTop: "4px" }}>26.5h</div>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>1 Pending Clearance</div>
              </div>
              <div style={{ background: "var(--bg-inset)", padding: "12px", borderRadius: "8px" }}>
                <strong style={{ fontSize: "12px", color: "var(--text-main)" }}>Operations &amp; WSH</strong>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#15803D", marginTop: "4px" }}>18.0h</div>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>1 Pending Clearance</div>
              </div>
              <div style={{ background: "var(--bg-inset)", padding: "12px", borderRadius: "8px" }}>
                <strong style={{ fontSize: "12px", color: "var(--text-main)" }}>C&amp;S Structural &amp; PE</strong>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#00747C", marginTop: "4px" }}>32.1h</div>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>1 Pending Clearance</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared Unified NopCertificate Component (P0.1, P3.2) */}
      {showCertificateModal && (
        <NopCertificate
          nop={showCertificateModal}
          onClose={() => setShowCertificateModal(null)}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "400px" }}>
            <div className="modal-header" style={{ padding: 0, marginBottom: "16px" }}>
              <h2 style={{ margin: 0 }}>Export Register</h2>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
                Select the format to export the current NOP registry view.
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {canExportData && hasNopPermission(role, "nop.export_xlsx") && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      handleExportXlsx();
                      setShowExportModal(false);
                    }}
                    style={{ justifyContent: "flex-start", gap: "10px", padding: "12px" }}
                  >
                    <IconDownload size={18} style={{ color: "#047857" }} />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-main)" }}>Excel (XLSX)</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>Full dataset with multiple worksheets</div>
                    </div>
                  </button>
                )}
                
                {canExportData && hasNopPermission(role, "nop.export_xlsx") && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      handleExportCsv();
                      setShowExportModal(false);
                    }}
                    style={{ justifyContent: "flex-start", gap: "10px", padding: "12px" }}
                  >
                    <IconFileText size={18} style={{ color: "#2563EB" }} />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-main)" }}>CSV</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>Flat text file for data integration</div>
                    </div>
                  </button>
                )}

                {hasNopPermission(role, "nop.export_pdf") && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      handleExportPdf();
                      setShowExportModal(false);
                    }}
                    style={{ justifyContent: "flex-start", gap: "10px", padding: "12px" }}
                  >
                    <IconFileText size={18} style={{ color: "#DC2626" }} />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-main)" }}>PDF Report</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>Formatted document for sharing</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: "none", paddingTop: 0, marginTop: "24px" }}>
              <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {actionFeedback && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#0F172A",
            color: "#FFFFFF",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            fontSize: "13px",
            fontWeight: 600,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "1px solid #FF8200",
            animation: "fadeIn 0.2s ease-out"
          }}
        >
          <IconCheckCircle size={16} color="#10B981" />
          <span>{actionFeedback}</span>
        </div>
      )}
    </div>
  );
}

export default function NopsCentralRegistryPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", color: "var(--text-muted)" }}>Loading NOP Registry...</div>}>
      <NopsCentralRegistryInner />
    </Suspense>
  );
}
