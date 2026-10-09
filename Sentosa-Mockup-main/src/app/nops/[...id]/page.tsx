"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const BoundaryMapDrawer = dynamic(() => import("@/components/BoundaryMapDrawer"), { 
  ssr: false, 
  loading: () => <div style={{ height: "300px", background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", border: "1px solid #CBD5E1" }}><span style={{fontSize: "12px", color: "var(--text-muted)"}}>Loading Boundary Map...</span></div> 
});
import {
  NOPApplication,
  loadStoredNops,
  saveStoredNops,
  derivePermitStatus,
  validateExtensionRequest,
  getRequiredDocumentsSchedule,
  isWorkAuthorized,
  resolveApprovers,
  DomainApproval
} from "@/lib/nopData";
import { recordNopAudit, loadNopAuditTrail } from "@/lib/nopAudit";
import { dispatchNopNotification } from "@/lib/nopNotifications";
import { useRole } from "@/context/RoleContext";
import { getUsers } from "@/lib/users";
import {
  hasNopPermission,
  canAccessNopRecord,
  isContactVisible,
  maskContactPhone,
  maskContactEmail,
  canActOnDomainApproval,
  isAssignedLiaisonOfficer,
  isDomainApproverForUser,
  isAssignedApproverOfNop,
  inferDepartmentId,
  canDecideRequestWithSoD
} from "@/lib/nopPermissions";
import { isContractorApplicant } from "@/lib/nopData";

function maskPhone(phone?: string): string {
  if (!phone) return "—";
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return trimmed;
  return trimmed.slice(0, 3) + " •••• " + trimmed.slice(-4);
}

function maskEmail(email?: string): string {
  if (!email) return "—";
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return user.charAt(0) + "•••••@" + domain;
}
import {
  IconCheckCircle,
  IconZap,
  IconAlertOctagon,
  IconAlertTriangle,
  IconMapPin,
  IconFileText,
  IconAward,
  IconUploadCloud,
  IconCalendar,
  IconArrowLeft,
  IconPlus,
  IconX,
  IconUser,
  IconShieldCheck,
  IconBan,
  IconClock,
  IconDownload,
  IconMap
} from "@/components/NopIcons";
import { NopCertificate } from "@/components/NopCertificate";
import { NopStatusBadge } from "@/components/NopStatusBadge";

type DetailTab = "overview" | "location" | "approvals" | "documents" | "workers" | "requests";

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "16px" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function NopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const idSegments = (params?.id as string[]) || [];
  const nopId = idSegments.join("/");
  const { role, username, approverDept } = useRole();
  const currentUserAccount = useMemo(() => {
    return getUsers().find((u) => u.name === username || u.role === role);
  }, [role, username]);
  const company = currentUserAccount?.company || (role === "Applicant (Contractor)" ? "Kim Seng Construction Pte Ltd" : undefined);
  const canActAsApplicant = currentUserAccount?.canActAsApplicant ?? (role === "Applicant (Contractor)");

  const [nops, setNops] = useState<NOPApplication[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showLiftModal, setShowLiftModal] = useState(false);
  const [liftReason, setLiftReason] = useState("");
  const [showContractorLiftModal, setShowContractorLiftModal] = useState(false);
  const [contractorLiftReason, setContractorLiftReason] = useState("");
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const [extensionEndDate, setExtensionEndDate] = useState("");
  const [extensionReason, setExtensionReason] = useState("");
  const [suspensionReason, setSuspensionReason] = useState("");
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; type: string } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ name: string, url: string } | null>(null);
  useEffect(() => {
    setNops(loadStoredNops());
    setLoaded(true);
  }, []);

  const nop = useMemo(() => nops.find((n) => n.id === nopId) || null, [nops, nopId]);

  // Auto-heal & auto-sync approvals and application status
  useEffect(() => {
    if (!nop || !loaded) return;
    let needsUpdate = false;
    let updatedNop: NOPApplication = { ...nop };

    // 1. If LO cleared or Under Review, ensure domainApprovals is populated from triggers
    if (nop.loPreScreenStatus === "Cleared for Approval" && (!nop.domainApprovals || nop.domainApprovals.length === 0) && nop.triggers && nop.triggers.length > 0) {
      updatedNop.domainApprovals = resolveApprovers(nop.triggers);
      needsUpdate = true;
    }

    // 2. Ensure every domainApproval has a departmentId
    if (updatedNop.domainApprovals && updatedNop.domainApprovals.length > 0) {
      const fixedApprovals = updatedNop.domainApprovals.map(da => {
        if (!da.departmentId) {
          const dept = inferDepartmentId(da);
          if (dept) {
            needsUpdate = true;
            return { ...da, departmentId: dept };
          }
        }
        return da;
      });
      if (needsUpdate) {
        updatedNop.domainApprovals = fixedApprovals;
      }
    }

    // 3. Auto-sync: If all domain approvals are approved, application status must be Approved
    if (updatedNop.domainApprovals && updatedNop.domainApprovals.length > 0) {
      const allApproved = updatedNop.domainApprovals.every(da => da.status === "Approved");
      if (allApproved && updatedNop.applicationStatus === "Under Review") {
        updatedNop.applicationStatus = "Approved";
        updatedNop.permitStatus = derivePermitStatus(updatedNop);
        updatedNop.updatedAt = new Date().toISOString();
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      const saved = nops.map(n => n.id === updatedNop.id ? updatedNop : n);
      setNops(saved);
      saveStoredNops(saved);
    }
  }, [nop, loaded, nops]);

  // P0-04: Deep-linking access control
  const hasAccess = useMemo(() => {
    if (!nop || !loaded) return true;
    return canAccessNopRecord({ role, username, companyName: company, approverDept, canActAsApplicant }, nop);
  }, [nop, loaded, role, username, company, approverDept, canActAsApplicant]);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Keyboard accessibility: Escape closes whichever action dialog is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setShowCertificateModal(false);
      setShowExtensionModal(false);
      setShowSuspensionModal(false);
      setShowUploadModal(false);
      setShowRevokeModal(false);
      setShowCancelModal(false);
      setShowLiftModal(false);
      setShowContractorLiftModal(false);
      setShowWithdrawModal(false);
      setPreviewDoc(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const persist = (updated: NOPApplication[]) => {
    setNops(updated);
    saveStoredNops(updated);
  };



  const handleClearForApproval = () => {
    if (!hasNopPermission(role, "nop.clear_for_approval") || !nop) return;
    if (!window.confirm("Confirm clearing this dossier for Technical Approvers?")) return;
    
    // Resolve domain approvals if empty or incomplete
    const resolvedApprovals = (nop.domainApprovals && nop.domainApprovals.length > 0)
      ? nop.domainApprovals
      : resolveApprovers(nop.triggers || []);

    const updated: NOPApplication = {
      ...nop,
      loPreScreenStatus: "Cleared for Approval",
      domainApprovals: resolvedApprovals.map(da => ({
        ...da,
        departmentId: da.departmentId || inferDepartmentId(da),
        status: da.status || "Pending",
        pendingSince: da.pendingSince || new Date().toISOString()
      }))
    };
    const saved = nops.map(n => n.id === nop.id ? updated : n);
    persist(saved);
    recordNopAudit({
      nopId: nop.id,
      action: "PRESCREEN_CLEAR",
      actionLabel: "LO Pre-Screening Cleared",
      actor: username,
      role: role,
      comment: "Dossier verified and forwarded to Technical Approvers."
    });
    showFeedback("Dossier Cleared for Approval. Routed to designated technical approvers.");
  };

  const handleReturnForClarification = () => {
    if (!hasNopPermission(role, "nop.request_changes") || !nop) return;
    const reason = window.prompt("Reason for return (optional):");
    if (reason === null) return;
    const updated: NOPApplication = { ...nop, applicationStatus: "Change Requested" };
    const saved = nops.map(n => n.id === nop.id ? updated : n);
    persist(saved);
    recordNopAudit({
      nopId: nop.id,
      action: "PRESCREEN_CHANGE_REQUEST",
      actionLabel: "Returned for Clarification",
      actor: username,
      role: role,
      comment: reason || "Dossier returned to applicant for corrections."
    });
    showFeedback("Application returned to Applicant.");
  };

  const handleEndorseClearance = (domainOrIdentifier: string) => {
    if (!nop || !hasNopPermission(role, "nop.endorse_clearance")) return;
    const step = (nop.domainApprovals || []).find(da =>
      da.domain === domainOrIdentifier ||
      da.departmentId === domainOrIdentifier ||
      da.ruleId === domainOrIdentifier ||
      da.approverGroup === domainOrIdentifier
    );
    const domainName = step?.domain || domainOrIdentifier;

    const comments = window.prompt(`Enter endorsement comments for ${domainName} (optional):`, "Clearance endorsed. All statutory safety requirements verified.");
    if (comments === null) return;
    
    let updatedNop: NOPApplication = { ...nop };
    updatedNop.domainApprovals = (updatedNop.domainApprovals || []).map(da => {
      const match = da.domain === domainOrIdentifier ||
        da.departmentId === domainOrIdentifier ||
        da.ruleId === domainOrIdentifier ||
        da.approverGroup === domainOrIdentifier;
      return match ? { ...da, status: "Approved" as const, comments: comments || undefined, decidedAt: new Date().toISOString(), approvedBy: username } : da;
    });

    const allApproved = updatedNop.domainApprovals.every(da => da.status === "Approved");
    if (allApproved && updatedNop.domainApprovals.length > 0) {
      updatedNop.applicationStatus = "Approved";
      updatedNop.permitStatus = derivePermitStatus(updatedNop);
      updatedNop.updatedAt = new Date().toISOString();
    }
    
    const saved = nops.map(n => n.id === nop.id ? updatedNop : n);
    persist(saved);
    recordNopAudit({
      nopId: nop.id,
      action: "ENDORSE",
      actionLabel: "Technical Clearance Endorsed",
      actor: username,
      role: role,
      comment: `Departmental clearance endorsed for ${domainName}. ${comments || ""}`
    });
    
    if (allApproved) {
      recordNopAudit({
        nopId: nop.id,
        action: "PERMIT_ISSUED",
        actionLabel: "Permit Issued",
        actor: "System",
        role: "System",
        comment: "All technical approvals endorsed. Application is now Approved."
      });
      showFeedback(`${domainName} clearance endorsed. All approvers have approved — Permit is now Approved!`);
    } else {
      showFeedback(`${domainName} clearance endorsed.`);
    }
  };

  const handleRequestRevisions = (domainOrIdentifier: string) => {
    if (!nop || !hasNopPermission(role, "nop.request_revisions")) return;
    const step = (nop.domainApprovals || []).find(da =>
      da.domain === domainOrIdentifier ||
      da.departmentId === domainOrIdentifier ||
      da.ruleId === domainOrIdentifier ||
      da.approverGroup === domainOrIdentifier
    );
    const domainName = step?.domain || domainOrIdentifier;

    const comments = window.prompt(`Enter revision instructions / reason for ${domainName} (mandatory):`);
    if (!comments || !comments.trim()) {
      if (comments !== null) alert("Revision reason is required.");
      return;
    }
    
    let updatedNop: NOPApplication = { ...nop, applicationStatus: "Change Requested" };
    updatedNop.domainApprovals = (updatedNop.domainApprovals || []).map(da => {
      const match = da.domain === domainOrIdentifier ||
        da.departmentId === domainOrIdentifier ||
        da.ruleId === domainOrIdentifier ||
        da.approverGroup === domainOrIdentifier;
      return match ? { ...da, status: "Change Requested" as const, comments: comments.trim(), decidedAt: new Date().toISOString(), decidedBy: username } : da;
    });
    
    const saved = nops.map(n => n.id === nop.id ? updatedNop : n);
    persist(saved);
    recordNopAudit({
      nopId: nop.id,
      action: "REQUEST_REVISIONS",
      actionLabel: "Revisions Requested",
      actor: username,
      role: role,
      comment: `Revisions requested for ${domainName}: ${comments}`
    });
    showFeedback(`Revisions requested for ${domainName}. Application status set to Change Requested.`);
  };

  const handlePrescreenExtension = (extId: string, action: "clear" | "reject") => {
    if (!nop) return;
    let comment = "";
    if (action === "reject") {
      const res = window.prompt("Reason for rejection:");
      if (!res) return;
      comment = res;
    }
    const updatedExts = (nop.extensionRequests || []).map(r => {
      if (r.id !== extId) return r;
      return action === "clear"
        ? { ...r, status: "Under Approver Review" as const, clearedBy: username, clearedAt: new Date().toISOString() }
        : { ...r, status: "Rejected" as const, decidedBy: username, decidedAt: new Date().toISOString(), comments: comment };
    });
    const updated = { ...nop, extensionRequests: updatedExts };
    persist(nops.map(n => n.id === nop.id ? updated : n));
    recordNopAudit({
      nopId: nop.id,
      action: action === "clear" ? "PRESCREEN_CLEAR" : "PRESCREEN_CHANGE_REQUEST",
      actor: username,
      role,
      comment: action === "clear" ? "Extension request cleared for Approver review" : `Extension request rejected at pre-screening: ${comment}`
    });
    showFeedback(action === "clear" ? "Extension cleared for Approver review." : "Extension request rejected.");
  };

  const handleDecideExtension = (extId: string, action: "approve" | "reject") => {
    if (!nop) return;
    const ext = (nop.extensionRequests || []).find(r => r.id === extId);
    if (!ext) return;
    if (!canDecideRequestWithSoD(ext, username) && role !== "NOP Operations Admin") {
      alert("Segregation of Duties: The Liaison Officer who cleared this request cannot make the final approval.");
      return;
    }
    let comment = "";
    if (action === "reject") {
      const res = window.prompt("Reason for rejection:");
      if (!res) return;
      comment = res;
    }
    const updatedExts = (nop.extensionRequests || []).map(r => {
      if (r.id !== extId) return r;
      return action === "approve"
        ? { ...r, status: "Approved" as const, decidedBy: username, decidedAt: new Date().toISOString() }
        : { ...r, status: "Rejected" as const, decidedBy: username, decidedAt: new Date().toISOString(), comments: comment };
    });
    const updated: NOPApplication = {
      ...nop,
      endDateTime: action === "approve" ? `${ext.requestedEndDate}T23:59:59+08:00` : nop.endDateTime,
      extensionRequests: updatedExts
    };
    persist(nops.map(n => n.id === nop.id ? updated : n));
    recordNopAudit({
      nopId: nop.id,
      action: action === "approve" ? "APPROVE_EXTENSION" : "REJECT_EXTENSION",
      actor: username,
      role,
      comment: action === "approve" ? `Validity extended to ${ext.requestedEndDate}` : `Extension rejected: ${comment}`
    });
    showFeedback(action === "approve" ? `Permit validity extended to ${ext.requestedEndDate}.` : "Extension request rejected.");
  };

  const handlePrescreenCancellation = (action: "clear" | "reject") => {
    if (!nop || !nop.cancellationRequest) return;
    let comment = "";
    if (action === "reject") {
      const res = window.prompt("Reason for rejection:");
      if (!res) return;
      comment = res;
    }
    const updatedReq = action === "clear"
      ? { ...nop.cancellationRequest, status: "Under Approver Review" as const, clearedBy: username }
      : { ...nop.cancellationRequest, status: "Rejected" as const, decidedBy: username, comments: comment };
    const updated = { ...nop, cancellationRequest: updatedReq };
    persist(nops.map(n => n.id === nop.id ? updated : n));
    showFeedback(action === "clear" ? "Cancellation cleared for Approver review." : "Cancellation request rejected.");
  };

  const handleDecideCancellation = (action: "approve" | "reject") => {
    if (!nop || !nop.cancellationRequest) return;
    if (!canDecideRequestWithSoD(nop.cancellationRequest, username) && role !== "NOP Operations Admin") {
      alert("Segregation of Duties: The Liaison Officer who cleared this request cannot make the final approval.");
      return;
    }
    let comment = "";
    if (action === "reject") {
      const res = window.prompt("Reason for rejection:");
      if (!res) return;
      comment = res;
    }
    const updatedReq = action === "approve"
      ? { ...nop.cancellationRequest, status: "Approved" as const, decidedBy: username }
      : { ...nop.cancellationRequest, status: "Rejected" as const, decidedBy: username, comments: comment };
    const updated: NOPApplication = {
      ...nop,
      permitStatus: action === "approve" ? "Cancelled" as const : nop.permitStatus,
      cancellationRequest: updatedReq
    };
    persist(nops.map(n => n.id === nop.id ? updated : n));
    showFeedback(action === "approve" ? "Permit has been Cancelled." : "Cancellation request rejected.");
  };

  const handlePrescreenLifting = (action: "clear" | "reject") => {
    if (!nop || !nop.liftingRequest) return;
    let comment = "";
    if (action === "reject") {
      const res = window.prompt("Reason for rejection:");
      if (!res) return;
      comment = res;
    }
    const updatedReq = action === "clear"
      ? { ...nop.liftingRequest, status: "Under Approver Review" as const, clearedBy: username }
      : { ...nop.liftingRequest, status: "Rejected" as const, decidedBy: username, comments: comment };
    const updated = { ...nop, liftingRequest: updatedReq };
    persist(nops.map(n => n.id === nop.id ? updated : n));
    showFeedback(action === "clear" ? "Lifting request cleared for Approver review." : "Lifting request rejected.");
  };

  const handleDecideLifting = (action: "approve" | "reject") => {
    if (!nop || !nop.liftingRequest) return;
    if (!canDecideRequestWithSoD(nop.liftingRequest, username) && role !== "NOP Operations Admin") {
      alert("Segregation of Duties: The Liaison Officer who cleared this request cannot make the final approval.");
      return;
    }
    let comment = "";
    if (action === "reject") {
      const res = window.prompt("Reason for rejection:");
      if (!res) return;
      comment = res;
    }
    const nextStatus = action === "approve" ? "Active" as const : nop.permitStatus;
    const updatedReq = action === "approve"
      ? { ...nop.liftingRequest, status: "Approved" as const, decidedBy: username }
      : { ...nop.liftingRequest, status: "Rejected" as const, decidedBy: username, comments: comment };
    const updated: NOPApplication = {
      ...nop,
      permitStatus: nextStatus,
      suspensionDetails: action === "approve" ? undefined : nop.suspensionDetails,
      liftingRequest: updatedReq
    };
    persist(nops.map(n => n.id === nop.id ? updated : n));
    showFeedback(action === "approve" ? "Suspension lifted! Work is authorized to resume." : "Lifting request rejected.");
  };

  const handleGrantIpa = () => {
    if (!nop) return;
    if (!window.confirm("Confirm granting Fast-Track In-Principle Approval (IPA)?")) return;
    const startStr = nop.startDateTime.substring(0, 10);
    const endStr = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const updated: NOPApplication = {
      ...nop,
      ipaStatus: "Granted",
      ipaAuthorisedPeriod: {
        startDate: startStr,
        endDate: endStr,
        workingHours: nop.workingHours || "08:00 - 18:00"
      }
    };
    persist(nops.map(n => n.id === nop.id ? updated : n));
    recordNopAudit({
      nopId: nop.id,
      action: "GRANT_IPA",
      actionLabel: "IPA Granted",
      actor: username,
      role,
      comment: "In-Principle Approval granted for urgent mobilization."
    });
    showFeedback("In-Principle Approval (IPA) granted.");
  };

  const handleRequestLiftingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nop || !contractorLiftReason.trim()) return;
    const updated: NOPApplication = {
      ...nop,
      liftingRequest: {
        requestedAt: new Date().toISOString(),
        requestedBy: username,
        reason: contractorLiftReason.trim(),
        status: "Pending Pre-screening"
      }
    };
    persist(nops.map(n => n.id === nop.id ? updated : n));
    setShowContractorLiftModal(false);
    setContractorLiftReason("");
    showFeedback("Suspension-Lifting request submitted to Liaison Officer.");
  };

  const handleLiftSuspension = () => {
    if (!hasNopPermission(role, "nop.lift_suspension")) return;
    if (!nop) return;
    setShowLiftModal(true);
    setLiftReason("");
  };

  const handleConfirmLiftSuspension = () => {
    if (!hasNopPermission(role, "nop.lift_suspension")) return;
    if (!nop || !liftReason.trim()) return;

    const { permitStatus: _drop, ...rest } = nop;
    const nextStatus = derivePermitStatus(rest);

    let statusMessage = "Works are authorized to resume.";
    if (nextStatus === "Upcoming") {
      statusMessage = "Scheduled work has not yet started.";
    } else if (nextStatus === "Expired") {
      statusMessage = "Note: NOP authorization window has expired.";
    }

    persist(
      nops.map((n) =>
        n.id !== nop.id ? n : {
          ...n,
          permitStatus: nextStatus,
          suspensionDetails: undefined,
          liftingRequest: n.liftingRequest ? {
            ...n.liftingRequest,
            status: "Approved" as const,
            decidedAt: new Date().toISOString(),
            decidedBy: username,
            comments: liftReason
          } : undefined,
          updatedAt: new Date().toISOString()
        }
      )
    );

    recordNopAudit({
      nopId: nop.id,
      action: "LIFT_SUSPENSION",
      actor: username,
      role,
      comment: liftReason.trim()
    });

    dispatchNopNotification({
      triggerCode: "NOTIF-14",
      nopId: nop.id,
      recipientRole: "Applicant (Contractor PIC)",
      recipientEmail: nop.applicantEmail,
      subject: `Stop-Work Suspension Lifted: ${nop.id}`,
      content: `Safety rectifications verified. ${statusMessage}`
    });

    dispatchNopNotification({
      triggerCode: "NOTIF-14",
      nopId: nop.id,
      recipientRole: "IIOC & Rangers",
      recipientEmail: "iioc.command@sentosa.gov.sg",
      subject: `Stop-Work Suspension Lifted: ${nop.id}`,
      content: `Safety rectifications verified. ${statusMessage}`
    });

    setShowLiftModal(false);
    showFeedback(`Stop-Work Suspension lifted for permit ${nop.id}. ${statusMessage}`);
  };

  const handleExtensionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setExtensionError(null);
    if (!nop || !extensionEndDate || !extensionReason) return;

    const validation = validateExtensionRequest(nop, extensionEndDate);
    if (!validation.valid) {
      setExtensionError(validation.error || "Invalid extension request.");
      return;
    }

    persist(
      nops.map((n) =>
        n.id !== nop.id
          ? n
          : {
              ...n,
              extensionRequests: [
                ...(n.extensionRequests || []),
                {
                  id: `ext-${Date.now()}`,
                  requestedEndDate: extensionEndDate,
                  reason: extensionReason,
                  status: "Pending Pre-screening" as const,
                  requestedAt: new Date().toISOString()
                }
              ],
              updatedAt: new Date().toISOString()
            }
      )
    );
    recordNopAudit({
      nopId: nop.id,
      action: "REQUEST_EXTENSION",
      actor: username,
      role,
      comment: `Requested validity extension to ${extensionEndDate}. Reason: ${extensionReason}`
    });
    dispatchNopNotification({
      triggerCode: "NOTIF-16",
      nopId: nop.id,
      content: `Extension requested for permit ${nop.id}. Current Validity End Date: ${nop.endDateTime || "N/A"}. Requested New End Date: ${extensionEndDate}. Reason: ${extensionReason || "Extension requested"}.`
    });
    setShowExtensionModal(false);
    setExtensionEndDate("");
    setExtensionReason("");
    showFeedback(`Extension request submitted for ${nop.id}. Awaiting Liaison Officer pre-screening and Approver decision.`);
  };

  const handleSuspensionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasNopPermission(role, "nop.suspend_permit")) return;
    if (!nop || !suspensionReason) return;

    persist(
      nops.map((n) =>
        n.id !== nop.id
          ? n
          : {
              ...n,
              permitStatus: "Suspended" as const,
              liftingRequest: undefined,
              suspensionDetails: {
                reason: suspensionReason,
                suspendedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
                suspendedBy: `${username} (${role})`,
                rectificationRequired: "Rectify safety hazard and request joint field re-inspection before resuming work."
              },
              updatedAt: new Date().toISOString()
            }
      )
    );
    recordNopAudit({
      nopId: nop.id,
      action: "SUSPEND",
      actor: username,
      role,
      comment: `Stop-work order issued: ${suspensionReason}`
    });
    dispatchNopNotification({
      triggerCode: "NOTIF-12",
      nopId: nop.id,
      recipientEmail: nop.applicantEmail,
      content: `Stop-Work Order enacted for permit ${nop.id}. Reason: ${suspensionReason}. Immediate cease of all work required. Effective immediately as of ${new Date().toISOString().replace("T", " ").substring(0, 16)} SGT.`
    });
    setShowSuspensionModal(false);
    setSuspensionReason("");
    showFeedback(`Stop-Work Order enacted for permit ${nop.id}. Notifications dispatched to Contractor and IIOC.`);
  };

  const executeRevokePermit = () => {
    if (!hasNopPermission(role, "nop.revoke_permit") || role === "Duty Manager") {
      showFeedback("You do not have permission to revoke permits.");
      return;
    }
    if (!nop || !revokeReason.trim()) {
      showFeedback("A specific justification is mandatory when revoking a permit.");
      return;
    }
    const finalReason = revokeReason.trim();
    persist(
      nops.map((n) => {
        if (n.id !== nop.id) return n;
        // P0-11: Auto-close all open requests with reason "Permit Revoked"
        const closedExtensions = (n.extensionRequests || []).map((r) =>
          r.status === "Pending Pre-screening" || r.status === "Under Approver Review"
            ? { ...r, status: "Rejected" as const, comments: "Permit Revoked", decidedAt: new Date().toISOString(), decidedBy: username }
            : r
        );
        const closedLifting = n.liftingRequest && (n.liftingRequest.status === "Pending Pre-screening" || n.liftingRequest.status === "Under Approver Review")
          ? { ...n.liftingRequest, status: "Rejected" as const, comments: "Permit Revoked", decidedAt: new Date().toISOString(), decidedBy: username }
          : n.liftingRequest;
        return {
          ...n,
          permitStatus: "Revoked" as const,
          rejectionReason: finalReason,
          extensionRequests: closedExtensions,
          liftingRequest: closedLifting,
          updatedAt: new Date().toISOString()
        };
      })
    );
    recordNopAudit({ nopId: nop.id, action: "REVOKE", actor: username, role, comment: `Permit revoked: ${finalReason}` });
    dispatchNopNotification({ triggerCode: "NOTIF-15", nopId: nop.id, recipientEmail: nop.applicantEmail, content: `Permit ${nop.id} has been formally Revoked. Reason: ${finalReason}. Permanent site vacating and mandatory reinstatement required.` });
    setShowRevokeModal(false);
    showFeedback(`Permit ${nop.id} has been formally Revoked. Open requests closed.`);
  };

  const executeCancelPermit = () => {
    if (!nop || !cancelReason.trim()) return;
    const finalReason = cancelReason.trim();
    persist(
      nops.map((n) =>
        n.id !== nop.id
          ? n
          : {
              ...n,
              cancellationRequest: {
                requestedAt: new Date().toISOString(),
                requestedBy: username,
                reason: finalReason,
                status: "Pending Pre-screening" as const
              },
              updatedAt: new Date().toISOString()
            }
      )
    );
    recordNopAudit({ nopId: nop.id, action: "REQUEST_CANCELLATION", actor: username, role, comment: `Permit cancellation requested: ${finalReason}` });
    dispatchNopNotification({ triggerCode: "NOTIF-10", nopId: nop.id, content: `Cancellation request submitted for permit ${nop.id}.` });
    setShowCancelModal(false);
    showFeedback(`Cancellation request submitted for ${nop.id}. Awaiting Liaison Officer pre-screening and Approver decision.`);
  };

  const handleWithdrawApplication = () => {
    if (!nop) return;
    persist(
      nops.map((n) =>
        n.id !== nop.id
          ? n
          : {
              ...n,
              applicationStatus: "Withdrawn" as const,
              updatedAt: new Date().toISOString()
            }
      )
    );
    recordNopAudit({ nopId: nop.id, action: "WITHDRAW_APPLICATION", actor: username, role, comment: "Application withdrawn by applicant" });
    dispatchNopNotification({ triggerCode: "NOTIF-09", nopId: nop.id, content: `NOP Application ${nop.id} was withdrawn by the applicant.` });
    showFeedback(`Application ${nop.id} has been withdrawn.`);
  };

  // SEC-05, SEC-07, SEC-09: Supporting document upload is restricted strictly to authorized contractor applicant
  const isApplicant = isContractorApplicant({ role, username, companyName: company, canActAsApplicant }, nop || undefined);
  const canUploadOverdueDoc = isApplicant;

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nop || !uploadDocName) return;
    if (!canUploadOverdueDoc) {
      showFeedback("Access Denied: Only the Applicant and assigned Liaison Officer are authorized to upload supporting documents under NOP submission guidelines.");
      return;
    }
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: uploadDocName,
      type: uploadedFile?.type || "PDF",
      status: "Pending Review" as const,
      uploadedAt: new Date().toISOString().substring(0, 10),
      fileSize: uploadedFile?.size || "2.1 MB"
    };
    persist(nops.map((n) => (n.id !== nop.id ? n : { ...n, documents: [...n.documents, newDoc], updatedAt: new Date().toISOString() })));
    recordNopAudit({ nopId: nop.id, action: "UPLOAD_DOC", actor: username, role, comment: `Supporting document uploaded: ${uploadDocName}` });
    setShowUploadModal(false);
    setUploadDocName("");
    setUploadedFile(null);
    showFeedback(`Document "${uploadDocName}" successfully uploaded and verified.`);
  };

  if (!loaded) {
    return <div>Loading NOP record…</div>;
  }

  if (!nop) {
    return (
      <div style={{ background: "#FFFFFF", border: "1px dashed var(--border-color)", borderRadius: "12px", padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
          <Link href="/nops" style={{ color: "var(--text-muted)", textDecoration: "none" }}>No Objection Permit</Link> / NOP Register
        </div>
        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>No NOP record found for &ldquo;{nopId}&rdquo;</div>
        <Link href="/nops" className="btn btn-secondary btn-sm" style={{ marginTop: "8px", display: "inline-flex" }}>Back to Register</Link>
      </div>
    );
  }

  const derivedStatus = derivePermitStatus(nop);

  const isAssignedApproverOrAdmin =
    role === "NOP Operations Admin" ||
    (role === "Technical Approver" && (
      hasNopPermission(role, "nop.view_all") ||
      nop?.domainApprovals?.some((a) =>
        a.approverName === username ||
        a.approverName?.includes(username || "") ||
        (approverDept && (a.departmentId === approverDept || a.approverGroup?.toLowerCase().includes(approverDept.toLowerCase())))
      )
    ));

  const isContractor = isContractorApplicant({ role, username, companyName: company, canActAsApplicant }, nop || undefined);

  // Workflow & Permission calculations for current logged-in demo user
  const canActAsLO = role === "Liaison Officer" || role === "NOP Operations Admin";
  const canClearPrescreen = hasNopPermission(role, "nop.clear_for_approval") && nop.applicationStatus === "Under Review" && nop.loPreScreenStatus !== "Cleared for Approval";

  // Pending domain approvals that the logged in approver can act on:
  const pendingDomainApprovalsForUser = (nop.domainApprovals || []).filter((da) =>
    canActOnDomainApproval({ role, username, approverDept }, nop, da)
  );

  const canContractorAmend = isContractor && (nop.applicationStatus === "Change Requested" || (nop.domainApprovals || []).some((da) => da.status === "Change Requested"));
  const canContractorRequestLift = isContractor && (derivedStatus === "Suspended" || nop.permitStatus === "Suspended") && (!nop.liftingRequest || nop.liftingRequest.status === "Rejected");
  const canGrantIpa = (role === "Duty Manager" || role === "NOP Operations Admin") && (nop.isUrgent || (nop.triggers && nop.triggers.length > 0)) && nop.ipaStatus !== "Granted" && (nop.applicationStatus === "Under Review" || nop.applicationStatus === "Draft");

  // Lifecycle requests for LO pre-screening:
  const pendingExtensionPrescreens = canActAsLO ? (nop.extensionRequests || []).filter((r) => r.status === "Pending Pre-screening") : [];
  const pendingCancelPrescreen = canActAsLO && nop.cancellationRequest?.status === "Pending Pre-screening";
  const pendingLiftingPrescreen = canActAsLO && nop.liftingRequest?.status === "Pending Pre-screening";

  // Lifecycle requests for Approver decision:
  const isApproverDecider = role === "Duty Manager" || role === "NOP Operations Admin" || isAssignedApproverOfNop({ role, username, approverDept }, nop);
  const pendingExtensionDecisions = isApproverDecider ? (nop.extensionRequests || []).filter((r) => r.status === "Under Approver Review" && canDecideRequestWithSoD(r, username)) : [];
  const pendingCancelDecision = isApproverDecider && nop.cancellationRequest?.status === "Under Approver Review" && canDecideRequestWithSoD(nop.cancellationRequest, username);
  const pendingLiftingDecision = isApproverDecider && nop.liftingRequest?.status === "Under Approver Review" && canDecideRequestWithSoD(nop.liftingRequest, username);
  const docSched = getRequiredDocumentsSchedule(nop);
  const canDownloadCertificate =
    nop.applicationStatus === "Approved" ||
    nop.ipaStatus === "Granted" ||
    derivedStatus === "Active" ||
    derivedStatus === "Upcoming" ||
    derivedStatus === "Suspended" ||
    derivedStatus === "Expired";
  const receivedDocs = (nop.documents || []).filter((d) => !d.isDeferred);
  const docsTabLabel =
    docSched.totalOverdue > 0
      ? `Documents (${docSched.totalReceived} received • ${docSched.totalOverdue} overdue)`
      : docSched.totalMissing > 0
      ? `Documents (${docSched.totalReceived} received • ${docSched.totalMissing} missing)`
      : `Documents (${docSched.totalReceived})`;

  const totalRequests = (nop.extensionRequests || []).length + (nop.cancellationRequest ? 1 : 0) + (nop.liftingRequest ? 1 : 0);

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "location", label: "Location" },

    { key: "approvals", label: `Approvals (${(nop.domainApprovals || []).length})` },
    { key: "documents", label: docsTabLabel },
    { key: "workers", label: `Workers (${nop.workers.length})` },
    { key: "requests", label: `Requests (${totalRequests})` }
  ];

  return (
    <div>
      {/* Toast */}
      {actionFeedback && (
        <div role="alert" style={{ position: "fixed", bottom: "24px", right: "24px", background: "#0F172A", color: "#FFFFFF", padding: "12px 20px", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)", fontSize: "13px", fontWeight: 600, zIndex: 99999, display: "flex", alignItems: "center", gap: "8px", border: "1.5px solid #10B981" }}>
          <IconCheckCircle size={16} color="#10B981" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Header */}
      <div className="page-header-bar glass" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div>
          {/* Breadcrumb */}
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Link href="/nops" style={{ color: "var(--text-muted)", textDecoration: "none" }}>No Objection Permit</Link>
            <span>/</span>
            <Link href="/nops" style={{ color: "var(--text-muted)", textDecoration: "none" }}>NOP Register</Link>
            <span>/</span>
            <span style={{ color: "var(--color-primary)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{nop.id}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
            <button
              onClick={() => router.push("/nops")}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: "11.5px", display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <IconArrowLeft size={13} />
              <span>Back to Register</span>
            </button>
            {nop.isUrgent && (
              <span style={{ fontSize: "10px", fontWeight: 800, background: "#FEF2F2", color: "#EF4444", padding: "3px 8px", borderRadius: "4px", border: "1px solid #FECACA" }}>
                ⚡ URGENT FAST-TRACK
              </span>
            )}
            {nop.applicationStatus === "Approved" && (
              <span className="badge" style={{ fontSize: "10.5px", fontWeight: 700, background: "#F1F5F9", color: "#334155", border: "1px solid #E2E8F0" }}>
                {nop.applicationStatus}
              </span>
            )}
            <NopStatusBadge nop={nop} />
            {nop.ipaStatus === "Granted" && (
              <span className="badge badge-high" style={{ fontSize: "10.5px", background: "rgba(0, 140, 149, 0.12)", color: "#00747C", fontWeight: 700 }}>
                IPA Granted
              </span>
            )}
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, margin: 0, fontFamily: "var(--font-mono)", color: "var(--color-primary)" }}>{nop.id}</h1>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)", margin: "4px 0 0 0" }}>{nop.workDescription}</p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "60%" }}>
          {isContractor &&
            hasNopPermission(role, "nop.request_extension") &&
            nop.applicationStatus === "Approved" &&
            (derivedStatus === "Upcoming" || derivedStatus === "Active" || derivedStatus === "Suspended") &&
            !(nop.extensionRequests || []).some((r) => r.status === "Approved" || r.status === "Pending Pre-screening" || r.status === "Under Approver Review") && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowExtensionModal(true); setExtensionEndDate(""); setExtensionReason(""); setExtensionError(null); }}>
              <IconCalendar size={13} strokeWidth={2} /> Request 1-Month Extension
            </button>
          )}
          {isAssignedApproverOrAdmin && hasNopPermission(role, "nop.lift_suspension") && nop.applicationStatus === "Approved" && derivedStatus === "Suspended" && (
            <button className="btn btn-success btn-sm" onClick={handleLiftSuspension} style={{ background: "#10B981", border: "none", color: "white" }}>
              <IconCheckCircle size={13} strokeWidth={2.5} /> Lift Suspension
            </button>
          )}
          {isAssignedApproverOrAdmin && hasNopPermission(role, "nop.suspend_permit") && nop.applicationStatus === "Approved" && derivedStatus === "Active" && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowSuspensionModal(true)} style={{ color: "#EF4444" }}>
              <IconAlertOctagon size={13} strokeWidth={2.2} /> Issue Stop-Work Suspension
            </button>
          )}
          {isAssignedApproverOrAdmin && hasNopPermission(role, "nop.revoke_permit") && nop.applicationStatus === "Approved" && (derivedStatus === "Upcoming" || derivedStatus === "Active" || derivedStatus === "Suspended") && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setRevokeReason(""); setShowRevokeModal(true); }} style={{ color: "#EF4444" }}>
              <IconBan size={13} strokeWidth={2.2} /> Revoke Permit
            </button>
          )}
          {isContractor && hasNopPermission(role, "nop.request_cancel") && nop.applicationStatus === "Approved" && (derivedStatus === "Upcoming" || derivedStatus === "Active" || derivedStatus === "Suspended") && !nop.cancellationRequest && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setCancelReason(""); setShowCancelModal(true); }}>
              <IconX size={13} strokeWidth={2.2} /> Request Cancellation
            </button>
          )}
          {isContractor && (nop.applicationStatus === "Under Review" || nop.applicationStatus === "Change Requested") && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowWithdrawModal(true)} style={{ color: "#DC2626" }}>
              <IconX size={13} strokeWidth={2.2} /> Withdraw Application
            </button>
          )}
          {isContractor && nop.applicationStatus === "Draft" && (
            <>
              <Link href={`/nops/new?edit=${nop.id}`} className="btn btn-primary btn-sm">
                Continue Editing Draft
              </Link>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this draft application?")) {
                    persist(nops.filter(n => n.id !== nop.id));
                    router.push("/nops");
                  }
                }}
                style={{ color: "#DC2626" }}
              >
                Delete Draft
              </button>
            </>
          )}
          {canDownloadCertificate && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowCertificateModal(true)}
              title="View & Print Official Digital Permit Certificate"
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 12px" }}
            >
              <IconAward size={14} color="#FF8200" />
              <span>Certificate</span>
            </button>
          )}
        </div>
      </div>

      {/* Role-Specific Action Callout Banner */}
      {canClearPrescreen && (
        <div style={{ background: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)", border: "1.5px solid #10B981", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", boxShadow: "0 2px 8px rgba(16, 185, 129, 0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#10B981", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconShieldCheck size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#065F46" }}>
                Action Required: Liaison Officer Pre-Screening Clearance
              </div>
              <div style={{ fontSize: "12.5px", color: "#047857", marginTop: "2px" }}>
                Review the {nop.triggers.length} statutory trigger{nop.triggers.length > 1 ? "s" : ""} and mandatory documents, then clear for Technical Approvers or return to contractor.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button className="btn btn-success btn-sm" onClick={handleClearForApproval} style={{ background: "#10B981", border: "none", color: "white", fontWeight: 700, padding: "6px 14px" }}>
              <IconCheckCircle size={14} strokeWidth={2.5} /> Clear for Technical Approval
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleReturnForClarification} style={{ color: "#EF4444", fontWeight: 700, padding: "6px 14px", background: "#FFFFFF" }}>
              <IconAlertTriangle size={14} strokeWidth={2.2} /> Return for Clarification
            </button>
          </div>
        </div>
      )}

      {pendingDomainApprovalsForUser.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)", border: "1.5px solid #00747C", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", boxShadow: "0 2px 8px rgba(0, 116, 124, 0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#00747C", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconCheckCircle size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#005F66" }}>
                Action Required: Technical Approver Endorsement ({pendingDomainApprovalsForUser.map(d => d.approverGroup || d.domain).join(", ")})
              </div>
              <div style={{ fontSize: "12.5px", color: "#0F766E", marginTop: "2px" }}>
                As the assigned Technical Approver, review work involvement &amp; safety plans to endorse or request revisions.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {pendingDomainApprovalsForUser.map((da) => (
              <React.Fragment key={da.ruleId || da.domain}>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleEndorseClearance(da.domain)}
                  style={{ background: "#10B981", border: "none", color: "white", fontWeight: 700, padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <IconCheckCircle size={14} strokeWidth={2.5} /> Endorse ({da.approverGroup || da.domain})
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleRequestRevisions(da.domain)}
                  style={{ color: "#EF4444", fontWeight: 700, padding: "6px 14px", background: "#FFFFFF", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <IconAlertTriangle size={14} strokeWidth={2.2} /> Request Revisions
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {canContractorAmend && (
        <div style={{ background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)", border: "1.5px solid #F59E0B", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#F59E0B", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconAlertTriangle size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#92400E" }}>
                Revisions Requested on NOP Application
              </div>
              <div style={{ fontSize: "12.5px", color: "#B45309", marginTop: "2px" }}>
                Reviewers have requested revisions or clarification. Please edit your application and resubmit for approval.
              </div>
            </div>
          </div>
          <Link href={`/nops/new?edit=${nop.id}`} className="btn btn-primary btn-sm" style={{ background: "#FF8200", borderColor: "#FF8200", color: "#FFFFFF", fontWeight: 700, padding: "6px 16px" }}>
            Amend &amp; Resubmit Application
          </Link>
        </div>
      )}

      {canContractorRequestLift && (
        <div style={{ background: "linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)", border: "1.5px solid #EF4444", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#EF4444", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconAlertOctagon size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#991B1B" }}>
                Stop-Work Order Active: Permit Suspended
              </div>
              <div style={{ fontSize: "12.5px", color: "#B91C1C", marginTop: "2px" }}>
                Reason: {nop.suspensionDetails?.reason || "Safety Hazard"}. Rectify safety issues on-site and submit a Suspension-Lifting Request.
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { setShowContractorLiftModal(true); setContractorLiftReason(""); }} style={{ color: "#166534", borderColor: "#166534", background: "#FFFFFF", fontWeight: 700, padding: "6px 16px" }}>
            Submit Suspension-Lifting Request
          </button>
        </div>
      )}

      {canGrantIpa && (
        <div style={{ background: "linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)", border: "1.5px solid #06B6D4", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#0891B2", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconZap size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#155E75" }}>
                Fast-Track In-Principle Approval (IPA) Available
              </div>
              <div style={{ fontSize: "12.5px", color: "#0E7490", marginTop: "2px" }}>
                As SDC Duty Manager, you can issue In-Principle Approval (IPA) to grant conditional early site mobilization.
              </div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleGrantIpa} style={{ background: "#00747C", borderColor: "#00747C", color: "#FFFFFF", fontWeight: 700, padding: "6px 16px" }}>
            <IconZap size={13} /> Grant Fast-Track IPA
          </button>
        </div>
      )}

      {/* Top 2 KPI Summary Row (matching media_1790222578913.png) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Card 1: LO PRE-SCREEN */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>LO PRE-SCREEN</span>
            <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: nop.loPreScreenStatus === "Cleared for Approval" ? "#DCFCE7" : "#FEF3C7", color: nop.loPreScreenStatus === "Cleared for Approval" ? "#15803D" : "#92400E", border: nop.loPreScreenStatus === "Cleared for Approval" ? "1px solid #BBF7D0" : "1px solid #FDE68A" }}>
              {nop.loPreScreenStatus === "Cleared for Approval" ? "✓ Cleared" : "Pending Review"}
            </span>
          </div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
            Assigned to {nop.sdcLiaisonOfficer || "Marcus Tan"}
          </div>
          <div style={{ fontSize: "12px", color: "#64748B" }}>
            {nop.loPreScreenStatus === "Cleared for Approval"
              ? "Pre-screening complete. Dossier cleared for technical approvers."
              : "Reviewing statutory triggers & supporting documents."}
          </div>
        </div>

        {/* Card 2: DOCUMENTS */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>DOCUMENTS</span>
            <span style={{
              fontSize: "11px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "4px",
              background: docSched.totalOverdue > 0 ? "#FEE2E2" : docSched.totalMissing > 0 ? "#FEF3C7" : "#EFF6FF",
              color: docSched.totalOverdue > 0 ? "#B91C1C" : docSched.totalMissing > 0 ? "#B45309" : "#2563EB",
              border: docSched.totalOverdue > 0 ? "1px solid #FECACA" : docSched.totalMissing > 0 ? "1px solid #FDE68A" : "1px solid #DBEAFE"
            }}>
              {docSched.totalOverdue > 0
                ? `${docSched.totalReceived} received • ${docSched.totalOverdue} overdue`
                : docSched.totalMissing > 0
                ? `${docSched.totalReceived} received • ${docSched.totalMissing} missing`
                : `${docSched.totalReceived} received • 0 missing`}
            </span>
          </div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
            {docSched.totalReceived} Supporting Documents Uploaded
          </div>
          <div style={{ fontSize: "12px", color: "#64748B" }}>
            {docSched.totalOverdue > 0
              ? `${docSched.totalOverdue} deferred statutory document(s) overdue for submission.`
              : docSched.totalMissing > 0
              ? `${docSched.totalMissing} mandatory document(s) missing from dossier.`
              : "All required statutory documents submitted for initial screening."}
          </div>
        </div>
      </div>

      {/* Two-column layout: tabbed content + persistent summary/actions sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: "20px", alignItems: "flex-start" }}>
        {/* Main column */}
        <div style={{ minWidth: 0 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid var(--border-color)", borderRadius: "10px", overflow: "hidden" }}>
            <div className="glass" style={{ padding: "0 16px", display: "flex", alignItems: "flex-end", gap: 0, background: "var(--bg-card)", borderBottom: "1px solid var(--border-color)", borderRadius: 0, overflowX: "auto" }}>
              {tabs.map((t) => {
                const isActive = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                      color: isActive ? "var(--color-primary)" : "var(--text-muted)",
                      padding: "12px 16px",
                      fontSize: "12.5px",
                      fontWeight: isActive ? 700 : 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div style={{ padding: "20px" }}>
            {activeTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Statutory Triggers Section */}
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>
                    STATUTORY TRIGGERS ({nop.triggers.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {nop.triggers.length === 0 ? (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>No statutory triggers recorded.</div>
                    ) : (
                      nop.triggers.map((tr, idx) => (
                        <div key={idx} style={{ padding: "12px 14px", borderRadius: "8px", background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ color: "#F59E0B", display: "flex", alignItems: "center" }}>
                            <IconAlertTriangle size={16} strokeWidth={2.2} />
                          </span>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>{tr}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Required Statutory Documents Section */}
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>
                    REQUIRED STATUTORY DOCUMENTS
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {nop.documents.map((doc) => (
                      <div key={doc.id} style={{ padding: "10px 14px", borderRadius: "8px", background: "#FFFFFF", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "12.5px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                            <IconFileText size={14} color="#FF8200" />
                            <a href="#" onClick={(e) => { e.preventDefault(); setPreviewDoc({ name: doc.name, url: "/uploads/" + doc.name }); }} style={{ color: "#2563EB", textDecoration: "none" }}>{doc.name}</a>
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                            Size: {doc.fileSize || "2.4 MB"} &bull; Uploaded: {doc.uploadedAt || "2026-03-20"}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {(() => {
                            const st = (doc.status || "Under Review") as string;
                            const isOk = st === "Verified" || st === "Approved";
                            const isErr = st === "Rejected" || st === "Overdue";
                            const isWarn = st === "Deferred" || st === "Change Requested" || st === "Required";
                            const bg = isOk ? "#DCFCE7" : isErr ? "#FEE2E2" : isWarn ? "#FEF3C7" : "#EFF6FF";
                            const color = isOk ? "#15803D" : isErr ? "#B91C1C" : isWarn ? "#B45309" : "#1D4ED8";
                            return (
                              <span style={{ fontSize: "10.5px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: bg, color }}>
                                {st}
                              </span>
                            );
                          })()}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPreviewDoc({ name: doc.name, url: "/uploads/" + doc.name })}
                            style={{ fontSize: "11.5px", padding: "3px 8px" }}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => window.open("/uploads/" + doc.name)}
                            style={{ fontSize: "11.5px", padding: "3px 8px" }}
                            title="Download Document"
                          >
                            <IconDownload size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {docSched.baselineMissing.map((missingName, idx) => (
                      <div key={`missing-${idx}`} style={{ padding: "10px 14px", borderRadius: "8px", background: "#FEF2F2", border: "1px solid #FECACA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "12.5px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", color: "#991B1B" }}>
                            <IconFileText size={14} color="#DC2626" />
                            <span>{missingName}</span>
                          </div>
                          <div style={{ fontSize: "11px", color: "#B91C1C", marginTop: "2px" }}>
                            Mandatory statutory document required for LO Pre-Screening clearance
                          </div>
                        </div>
                        <span style={{ fontSize: "10.5px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FECACA" }}>
                          Missing
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical Approvals Summary Section */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      TECHNICAL APPROVALS SUMMARY ({nop.domainApprovals.length})
                    </div>
                    {nop.loPreScreenStatus !== "Cleared for Approval" && (
                      <span style={{ fontSize: "11px", color: "#D97706", fontWeight: 600 }}>
                        Awaiting LO Pre-Screen Clearance
                      </span>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(nop.domainApprovals.length || 1, 4)}, minmax(0, 1fr))`, gap: "10px" }}>
                    {nop.domainApprovals.map((da, idx) => {
                      const isMyDomain = isDomainApproverForUser(da, { role, username, approverDept });
                      const isApproved = da.status === "Approved";
                      const isRejected = da.status === "Change Requested";

                      return (
                        <div
                          key={idx}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "8px",
                            border: isApproved ? "1px solid #BBF7D0" : "1px solid #E2E8F0",
                            background: isApproved ? "#F0FDF4" : "#F8FAFC",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between"
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                              <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#1E293B" }}>
                                {da.approverGroup || da.domain}
                              </div>
                              {isMyDomain && (
                                <span style={{ fontSize: "9.5px", fontWeight: 800, padding: "1px 5px", borderRadius: "3px", background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>
                                  YOU
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748B", marginTop: "3px" }}>
                              {da.approverName} ({da.approverRole || "Technical Approver"})
                            </div>
                            {da.comments && (
                              <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px", fontStyle: "italic" }}>
                                &ldquo;{da.comments}&rdquo;
                              </div>
                            )}
                          </div>

                          <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed #E2E8F0" }}>
                            <div>
                              <span style={{
                                fontSize: "11px",
                                fontWeight: 800,
                                color: isApproved ? "#15803D" : isRejected ? "#DC2626" : nop.loPreScreenStatus !== "Cleared for Approval" ? "#64748B" : "#EA580C"
                              }}>
                                {isApproved
                                  ? "✓ Approved"
                                  : isRejected
                                  ? "✕ Change Requested"
                                  : nop.loPreScreenStatus !== "Cleared for Approval"
                                  ? "⏳ Awaiting LO Clearance"
                                  : "● Pending Endorsement"}
                              </span>
                              {da.decidedAt && (
                                <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "2px" }}>
                                  {da.decidedAt.substring(0, 16).replace("T", " ")}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "location" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ background: "#FFFFFF", borderRadius: "10px", padding: "20px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0", color: "var(--text-main)" }}>Location & Schedule</h3>
                  <div style={{ padding: "16px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
                      <IconMapPin size={13} color="var(--text-muted)" />
                      <span>{nop.location} &bull; {nop.zone}</span>
                    </div>
                    {(nop.unitRoomNumber || nop.spaceDescription) && (
                      <div style={{ fontSize: "12px", color: "#00747C", fontWeight: 700, marginTop: "4px" }}>
                        Space: {nop.unitRoomNumber ? `Unit/Room ${nop.unitRoomNumber} ` : ""}{nop.spaceDescription ? `(${nop.spaceDescription})` : ""}
                      </div>
                    )}
                    <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <IconClock size={12} />
                      <span>{nop.workingHours}</span>
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                      Validity: {nop.startDateTime.substring(0, 10)} → {nop.endDateTime.substring(0, 10)}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <IconShieldCheck size={12} />
                      <span>Liaison Officer: {nop.liaisonOfficer || nop.sdcLiaisonOfficer}</span>
                    </div>
                    {nop.excavationDepth && (
                      <div style={{ fontSize: "12px", color: "#B45309", fontWeight: 700, marginTop: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
                        <span>⛏ Excavation Depth: {nop.excavationDepth}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ background: "#FFFFFF", borderRadius: "10px", padding: "20px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0", color: "var(--text-main)" }}>Work Boundary Map</h3>
                  <div style={{ borderRadius: "8px", border: "1px solid #CBD5E1", overflow: "hidden", position: "relative" }}>
                    <BoundaryMapDrawer center={{ lat: 1.2494, lng: 103.8303 }} onBoundaryChange={() => {}} readOnly={true} heightPx={300} />






                  </div>
                </div>


              </div>
            )}


















            {activeTab === "approvals" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(nop.domainApprovals || []).length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", background: "#F8FAFC", borderRadius: "8px", border: "1px dashed var(--border-color)", color: "var(--text-muted)", fontSize: "12.5px" }}>
                    Awaiting Liaison Officer pre-screening clearance before routing to department approvers.
                  </div>
                ) : (
                  nop.domainApprovals.map((da, idx) => {
                    const canAct = canActOnDomainApproval({ role, username, approverDept }, nop, da);
                    const isMyDomain = isDomainApproverForUser(da, { role, username, approverDept });
                    const isApproved = da.status === "Approved";
                    const isRejected = da.status === "Change Requested";

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: "12px 16px",
                          borderRadius: "8px",
                          border: canAct ? "1.5px solid #00747C" : isApproved ? "1px solid #BBF7D0" : "1px solid var(--border-color)",
                          background: isApproved ? "#F0FDF4" : canAct ? "#F0FDFA" : "#FFFFFF",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px"
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>{da.domain}</span>
                            {da.approverGroup && (
                              <span style={{ fontSize: "10.5px", color: "var(--text-muted)", background: "var(--bg-inset)", padding: "1px 6px", borderRadius: "4px" }}>
                                {da.approverGroup}
                              </span>
                            )}
                            {isMyDomain && (
                              <span style={{ fontSize: "10px", fontWeight: 800, padding: "1px 6px", borderRadius: "4px", background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>
                                ASSIGNED TO YOU
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                            {da.approverName} &bull; {da.approverRole || "Technical Approver"}
                            {da.decidedAt ? ` &bull; Decided: ${da.decidedAt.substring(0, 16).replace("T", " ")}` : ""}
                          </div>
                          {da.comments && (
                            <div style={{ fontSize: "11.5px", color: isRejected ? "#DC2626" : "var(--text-sub)", marginTop: "4px" }}>
                              &ldquo;{da.comments}&rdquo;
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span className={`badge ${isApproved ? "badge-onsite" : isRejected ? "badge-high" : "badge-review"}`}>
                            {da.status}
                          </span>

                          {canAct ? (
                            <>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleEndorseClearance(da.domain)}
                                style={{ fontSize: "11.5px", padding: "4px 10px", background: "#10B981", border: "none", color: "white", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}
                              >
                                <IconCheckCircle size={12} strokeWidth={2.5} /> Endorse
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleRequestRevisions(da.domain)}
                                style={{ fontSize: "11.5px", padding: "4px 10px", color: "#EF4444", fontWeight: 700 }}
                              >
                                Request Revisions
                              </button>
                            </>
                          ) : isMyDomain && nop.loPreScreenStatus !== "Cleared for Approval" ? (
                            <span style={{ fontSize: "11px", color: "#64748B", fontStyle: "italic" }}>
                              Awaiting LO pre-screening clearance
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "documents" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Received Documents Section */}
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <IconFileText size={14} color="var(--color-primary)" />
                    <span>Received Supporting Documents ({receivedDocs.length})</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {receivedDocs.map((doc) => (
                      <div key={doc.id} style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "#FFFFFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "12.5px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                            <IconFileText size={14} strokeWidth={2} color="var(--color-primary)" />
                            <a href="#" onClick={(e) => { e.preventDefault(); window.open(`/uploads/${doc.name}`, "_blank"); }} style={{ color: "var(--color-primary)", textDecoration: "underline", cursor: "pointer" }}>{doc.name}</a>
                            {doc.version && doc.version > 1 && (
                              <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", background: "#EFF6FF", color: "#1D4ED8" }}>
                                v{doc.version}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                            Type: {doc.type} &bull; Size: {doc.fileSize || "1.8 MB"} &bull; Uploaded: {doc.uploadedAt || "Verified"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <span className={`badge ${doc.status === "Verified" ? "badge-onsite" : doc.status === "Overdue" ? "badge-high" : "badge-review"}`}>
                            {doc.status}
                          </span>
                          <button className="btn btn-secondary btn-sm" onClick={() => window.open(`/uploads/${doc.name}`, "_blank")} title="Download Document" style={{ padding: "4px", display: "flex" }}>
                            <IconDownload size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {docSched.baselineMissing.map((missingName, idx) => (
                      <div key={`missing-doc-${idx}`} style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #FECACA", background: "#FEF2F2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#991B1B", display: "flex", alignItems: "center", gap: "6px" }}>
                            <IconFileText size={14} color="#DC2626" />
                            <span>{missingName}</span>
                          </div>
                          <div style={{ fontSize: "11px", color: "#991B1B", marginTop: "2px" }}>
                            Mandatory statutory baseline document &bull; Required for clearance
                          </div>
                        </div>
                        <span className="badge badge-high" style={{ fontSize: "10.5px" }}>
                          Missing
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deferred Supporting Documents Section (Post-IPA Requirements) */}
                {nop.deferredDocuments && nop.deferredDocuments.length > 0 && (
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#DC2626", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <IconAlertTriangle size={14} color="#DC2626" />
                      <span>Deferred Supporting Documents (Post-IPA Requirement • {nop.deferredDocuments.length})</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {nop.deferredDocuments.map((defDoc) => (
                        <div key={defDoc.id} style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #FECACA", background: "#FEF2F2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#991B1B" }}>
                              {defDoc.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "#7F1D1D", marginTop: "2px" }}>
                              Mandatory for: {defDoc.requiredForTrigger} &bull; Due: {nop.documentDeadline ? nop.documentDeadline.substring(0, 10) : "19 Sep 2026"} (Overdue)
                            </div>
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "12px", background: "#FEE2E2", color: "#DC2626", border: "1px solid #FECACA" }}>
                            {defDoc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Button: Upload Overdue Supporting Document (NOP-05 Role Check) */}
                {nop.documentCompletion === "Overdue" && (
                  <div style={{ marginTop: "4px" }}>
                    {canUploadOverdueDoc ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowUploadModal(true)}
                        style={{ background: "#EF4444", display: "inline-flex", alignItems: "center", gap: "5px", width: "fit-content" }}
                      >
                        <IconPlus size={13} strokeWidth={2.5} />
                        <span>Upload Overdue Supporting Document Now</span>
                      </button>
                    ) : (
                      <div style={{ padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", fontSize: "11.5px", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <IconAlertTriangle size={13} color="#94A3B8" />
                        <span>Only the Applicant (Contractor) is authorized to upload overdue documents.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "workers" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, textTransform: "none" }}>Registered Workers</h4>
                </div>
                {nop.workers.map((w) => {
                  const isVerified = (w as any).verified !== false;
                  return (
                    <div key={w.id} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--bg-inset)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                          <IconUser size={13} strokeWidth={2} />
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 700 }}>{w.name} &bull; {w.role} {w.tradeOccupation ? `(${w.tradeOccupation})` : ""}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Pass: {w.passType}</div>
                          {(w.employerCompany || w.workPermitNumber) && (
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                              {w.employerCompany || "—"} &bull; Work Permit: {w.workPermitNumber || "—"}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={isVerified ? "badge badge-onsite" : "badge"} style={{ fontSize: "10px", background: isVerified ? undefined : "#FEF3C7", color: isVerified ? undefined : "#92400E" }}>
                        {isVerified ? "VERIFIED" : "PENDING VERIFICATION"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

                        {activeTab === "requests" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 4px 0", color: "var(--text-main)" }}>
                    Lifecycle Requests Timeline
                  </h3>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-muted)" }}>
                    Complete audit record of permit extension, cancellation, and suspension-lifting requests.
                  </p>
                </div>

                {totalRequests === 0 ? (
                  <div style={{ padding: "30px", textAlign: "center", background: "#F8FAFC", borderRadius: "8px", border: "1px dashed var(--border-color)", color: "var(--text-muted)", fontSize: "13px" }}>
                    No lifecycle requests submitted for this permit.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(nop.extensionRequests || []).map((ext) => (
                      <div key={ext.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "14px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: "#D97706" }}>Extension Request</span>
                          <span className="badge" style={{ fontSize: "10.5px" }}>{ext.status}</span>
                        </div>
                        <div style={{ fontSize: "12.5px", color: "var(--text-main)" }}>
                          Requested End Date: <strong>{ext.requestedEndDate}</strong> &bull; Submitted: {ext.requestedAt ? ext.requestedAt.substring(0, 16).replace("T", " ") : "—"}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-sub)", marginTop: "4px" }}>
                          <strong>Reason:</strong> {ext.reason}
                        </div>
                        {ext.clearedBy && (
                          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                            Pre-screen cleared by: {ext.clearedBy} {ext.clearedAt ? "(" + ext.clearedAt.substring(0, 16).replace("T", " ") + ")" : ""}
                          </div>
                        )}
                        {ext.decidedBy && (
                          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                            Final Decision by: {ext.decidedBy} {ext.decidedAt ? "(" + ext.decidedAt.substring(0, 16).replace("T", " ") + ")" : ""}
                          </div>
                        )}
                        {ext.comments && (
                          <div style={{ fontSize: "12px", color: "#B91C1C", marginTop: "4px" }}>
                            <strong>Reviewer Notes:</strong> {ext.comments}
                          </div>
                        )}

                        {/* Action buttons for LO pre-screening */}
                        {ext.status === "Pending Pre-screening" && canActAsLO && (
                          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                            <button
                              className="btn btn-success btn-xs"
                              onClick={() => handlePrescreenExtension(ext.id, "clear")}
                              style={{ background: "#10B981", border: "none", color: "white", fontSize: "11.5px", padding: "4px 12px", fontWeight: 700 }}
                            >
                              ✓ Pre-screen: Clear for Approver Review
                            </button>
                            <button
                              className="btn btn-secondary btn-xs"
                              onClick={() => handlePrescreenExtension(ext.id, "reject")}
                              style={{ color: "#EF4444", fontSize: "11.5px", padding: "4px 12px", fontWeight: 700 }}
                            >
                              ✕ Pre-screen: Reject
                            </button>
                          </div>
                        )}

                        {/* Action buttons for Approver decision */}
                        {ext.status === "Under Approver Review" && isApproverDecider && (
                          canDecideRequestWithSoD(ext, username) || role === "NOP Operations Admin" ? (
                            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                              <button
                                className="btn btn-success btn-xs"
                                onClick={() => handleDecideExtension(ext.id, "approve")}
                                style={{ background: "#10B981", border: "none", color: "white", fontSize: "11.5px", padding: "4px 12px", fontWeight: 700 }}
                              >
                                ✓ Approve Extension (Grant 1 Month)
                              </button>
                              <button
                                className="btn btn-secondary btn-xs"
                                onClick={() => handleDecideExtension(ext.id, "reject")}
                                style={{ color: "#EF4444", fontSize: "11.5px", padding: "4px 12px", fontWeight: 700 }}
                              >
                                ✕ Reject Extension
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: "11.5px", color: "#64748B", marginTop: "8px", fontStyle: "italic" }}>
                              ⚠ Segregation of Duties: You pre-screened this extension and cannot authorize the final decision.
                            </div>
                          )
                        )}
                      </div>
                    ))}

                    {nop.cancellationRequest && (
                      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "14px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: "#DC2626" }}>Permit Cancellation Request</span>
                          <span className="badge" style={{ fontSize: "10.5px" }}>{nop.cancellationRequest.status}</span>
                        </div>
                        <div style={{ fontSize: "12.5px", color: "var(--text-main)" }}>
                          Submitted by: <strong>{nop.cancellationRequest.requestedBy}</strong> ({nop.cancellationRequest.requestedAt ? nop.cancellationRequest.requestedAt.substring(0, 16).replace("T", " ") : "—"})
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-sub)", marginTop: "4px" }}>
                          <strong>Contractor Reason:</strong> {nop.cancellationRequest.reason}
                        </div>
                        {nop.cancellationRequest.clearedBy && (
                          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                            Pre-screen cleared by: {nop.cancellationRequest.clearedBy}
                          </div>
                        )}
                        {nop.cancellationRequest.decidedBy && (
                          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                            Decision by: {nop.cancellationRequest.decidedBy}
                          </div>
                        )}

                        {/* Action buttons for LO pre-screening */}
                        {nop.cancellationRequest.status === "Pending Pre-screening" && canActAsLO && (
                          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                            <button
                              className="btn btn-success btn-xs"
                              onClick={() => handlePrescreenCancellation("clear")}
                              style={{ background: "#10B981", border: "none", color: "white", fontSize: "11.5px", padding: "4px 12px", fontWeight: 700 }}
                            >
                              ✓ Pre-screen: Clear for Approver Decision
                            </button>
                            <button
                              className="btn btn-secondary btn-xs"
                              onClick={() => handlePrescreenCancellation("reject")}
                              style={{ color: "#EF4444", fontSize: "11.5px", padding: "4px 12px", fontWeight: 700 }}
                            >
                              ✕ Pre-screen: Reject
                            </button>
                          </div>
                        )}

                        {/* Action buttons for Approver decision */}
                        {nop.cancellationRequest.status === "Under Approver Review" && isApproverDecider && (
                          canDecideRequestWithSoD(nop.cancellationRequest, username) || role === "NOP Operations Admin" ? (
                            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                              <button
                                className="btn btn-success btn-xs"
                                onClick={() => handleDecideCancellation("approve")}
                                style={{ background: "#10B981", border: "none", color: "white", fontSize: "11.5px", padding: "4px 12px", fontWeight: 700 }}
                              >
                                ✓ Confirm Permit Cancellation
                              </button>
                              <button
                                className="btn btn-secondary btn-xs"
                                onClick={() => handleDecideCancellation("reject")}
                                style={{ color: "#EF4444", fontSize: "11.5px", padding: "4px 12px", fontWeight: 700 }}
                              >
                                ✕ Reject Cancellation
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: "11.5px", color: "#64748B", marginTop: "8px", fontStyle: "italic" }}>
                              ⚠ Segregation of Duties: You pre-screened this cancellation and cannot authorize the final decision.
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {nop.liftingRequest && (
                      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "14px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: "#166534" }}>Suspension-Lifting Request</span>
                          <span className="badge" style={{ fontSize: "10.5px" }}>{nop.liftingRequest.status}</span>
                        </div>
                        <div style={{ fontSize: "12.5px", color: "var(--text-main)" }}>
                          Submitted by: <strong>{nop.liftingRequest.requestedBy}</strong> ({nop.liftingRequest.requestedAt ? nop.liftingRequest.requestedAt.substring(0, 16).replace("T", " ") : "—"})
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-sub)", marginTop: "4px" }}>
                          <strong>Contractor Rectification:</strong> {nop.liftingRequest.reason}
                        </div>
                        {nop.liftingRequest.clearedBy && (
                          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                            Pre-screen cleared by: {nop.liftingRequest.clearedBy}
                          </div>
                        )}
                        {nop.liftingRequest.decidedBy && (
                          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                            Decision by: {nop.liftingRequest.decidedBy}
                          </div>
                        )}

                        {/* Action buttons for LO pre-screening */}
                        {nop.liftingRequest.status === "Pending Pre-screening" && canActAsLO && (
                          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                            <button
                              className="btn btn-success btn-xs"
                              onClick={() => handlePrescreenLifting("clear")}
                              style={{ background: "#10B981", border: "none", color: "white", fontSize: "11.5px", padding: "4px 12px", fontWeight: 700 }}
                            >
                              ✓ Pre-screen: Clear for Approver Decision
                            </button>
                            <button
                              className="btn btn-secondary btn-xs"
                              onClick={() => handlePrescreenLifting("reject")}
                              style={{ color: "#EF4444", fontSize: "11.5px", padding: "4px 12px", fontWeight: 700 }}
                            >
                              ✕ Pre-screen: Reject
                            </button>
                          </div>
                        )}

                        {/* Action buttons for Approver decision */}
                        {nop.liftingRequest.status === "Under Approver Review" && isApproverDecider && (
                          canDecideRequestWithSoD(nop.liftingRequest, username) || role === "NOP Operations Admin" ? (
                            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                              <button
                                className="btn btn-success btn-xs"
                                onClick={() => handleDecideLifting("approve")}
                                style={{ background: "#10B981", border: "none", color: "white", fontSize: "11.5px", padding: "4px 12px", fontWeight: 700 }}
                              >
                                ✓ Approve Lifting &amp; Resume Work
                              </button>
                              <button
                                className="btn btn-secondary btn-xs"
                                onClick={() => handleDecideLifting("reject")}
                                style={{ color: "#EF4444", fontSize: "11.5px", padding: "4px 12px", fontWeight: 700 }}
                              >
                                ✕ Reject Lifting
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: "11.5px", color: "#64748B", marginTop: "8px", fontStyle: "italic" }}>
                              ⚠ Segregation of Duties: You pre-screened this lifting request and cannot authorize the final decision.
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}


            </div>
          </div>
        </div>

        {/* Sidebar: persistent facts + quick actions (no longer buried in tabs) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", position: "sticky", top: "20px" }}>
          <SidebarCard title="Contractor Organization">
            <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{nop.companyName}</div>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>UEN: {nop.companyUen}</div>
          </SidebarCard>

          {(() => {
            const visible = isContactVisible({ role, username, email: nop.applicantEmail, approverDept }, nop);
            const displayPhone = visible ? (nop.applicantPhone || "—") : maskContactPhone(nop.applicantPhone);
            const displayEmail = visible ? (nop.applicantEmail || "—") : maskContactEmail(nop.applicantEmail);
            return (
              <SidebarCard title="Person-in-Charge (24/7)">
                <div style={{ fontSize: "13px", fontWeight: 700 }}>{nop.applicantName}</div>
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{displayPhone}</div>
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{displayEmail}</div>
              </SidebarCard>
            );
          })()}

          <SidebarCard title="Audit Trail">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {loadNopAuditTrail(nop.id).length === 0 ? (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center" }}>
                  No formal lifecycle events logged.
                </div>
              ) : (
                loadNopAuditTrail(nop.id).map((entry) => (
                  <div key={entry.id} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", borderLeft: "3px solid var(--color-primary)", background: "var(--bg-card)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 800, fontSize: "11px", color: "var(--color-primary)" }}>{(entry.actionLabel || entry.action).replace(/_/g, " ")}</span>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{entry.timestamp.replace("T", " ").substring(0, 16)}</span>
                    </div>
                    <div style={{ fontSize: "10.5px", color: "var(--text-sub)", marginTop: "2px" }}>
                      Actor: <strong>{entry.actor}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SidebarCard>


          {nop.ipaStatus === "Granted" && (() => {
            const periodStr = typeof nop.ipaAuthorisedPeriod === "string"
              ? nop.ipaAuthorisedPeriod
              : nop.ipaAuthorisedPeriod
              ? `${nop.ipaAuthorisedPeriod.startDate} to ${nop.ipaAuthorisedPeriod.endDate}`
              : "15 Sep 2026 to 19 Sep 2026";
            const endDate = typeof nop.ipaAuthorisedPeriod === "object" && nop.ipaAuthorisedPeriod?.endDate
              ? nop.ipaAuthorisedPeriod.endDate
              : "2026-09-19";
            const isWindowExpired = new Date(endDate) < new Date("2026-09-24");
            const isDocsOverdue = nop.documentCompletion === "Overdue";
            const pendingDocsCount = (nop.deferredDocuments || []).filter(d => d.status !== "Accepted").length || 2;

            return (
              <div style={{ background: "#FFFFFF", border: isWindowExpired ? "1.5px solid #FCA5A5" : "1.5px solid #00747C", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#00747C", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "4px" }}>
                    <IconZap size={13} color="#00747C" />
                    <span>In-Principle Approval (IPA)</span>
                  </div>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>
                    Decision: Granted
                  </span>
                </div>

                {/* 3 Decoupled Dimensions (NOP-07) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                  {/* Dimension 1: IPA Decision */}
                  <div style={{ padding: "8px 10px", borderRadius: "6px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>1. IPA Decision</div>
                    <div style={{ fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
                      Granted by SDC Duty Manager
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                      Authorized early preparatory mobilization under conditional SLA.
                    </div>
                  </div>

                  {/* Dimension 2: Work Authorization Window */}
                  <div style={{ padding: "8px 10px", borderRadius: "6px", background: isWindowExpired ? "#FEF2F2" : "#F0FDF4", border: isWindowExpired ? "1px solid #FECACA" : "1px solid #BBF7D0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: isWindowExpired ? "#991B1B" : "#166534", textTransform: "uppercase" }}>
                        2. Work Authorization Window
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: 800, padding: "1px 6px", borderRadius: "4px", background: isWindowExpired ? "#FEE2E2" : "#DCFCE7", color: isWindowExpired ? "#B91C1C" : "#15803D" }}>
                        {isWindowExpired ? "Window Expired" : "Authorized"}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, color: isWindowExpired ? "#B91C1C" : "#15803D", marginTop: "2px" }}>
                      {periodStr}
                    </div>
                    {isWindowExpired && (
                      <div style={{ fontSize: "11px", color: "#991B1B", marginTop: "2px", fontWeight: 500 }}>
                        ⚠ Authorization window expired on 19 Sep 2026. On-site physical works are strictly NOT permitted.
                      </div>
                    )}
                  </div>

                  {/* Dimension 3: Deferred Documents Status */}
                  <div style={{ padding: "8px 10px", borderRadius: "6px", background: isDocsOverdue ? "#FFFBEB" : "#F8FAFC", border: isDocsOverdue ? "1px solid #FDE68A" : "1px solid #E2E8F0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: isDocsOverdue ? "#92400E" : "var(--text-muted)", textTransform: "uppercase" }}>
                        3. Deferred Documents
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: 800, padding: "1px 6px", borderRadius: "4px", background: isDocsOverdue ? "#FEE2E2" : "#E0F2FE", color: isDocsOverdue ? "#DC2626" : "#0284C7" }}>
                        {isDocsOverdue ? `Overdue (${pendingDocsCount} Pending)` : "In Progress"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: isDocsOverdue ? "#B45309" : "var(--text-main)", marginTop: "2px" }}>
                      {nop.documentDeadline ? `Deadline was ${nop.documentDeadline.substring(0, 10)}. ` : ""}
                      {pendingDocsCount} required post-commencement document{pendingDocsCount > 1 ? "s" : ""} pending submission.
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}


        </div>
      </div>

      {/* Certificate */}
      {showCertificateModal && <NopCertificate nop={nop} onClose={() => setShowCertificateModal(false)} />}

      {/* Withdraw Modal (DOC-13) */}
      {showWithdrawModal && (
        <div className="modal-backdrop" onClick={() => setShowWithdrawModal(false)} style={{ zIndex: 10000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px", background: "#FFFFFF", borderRadius: "14px", padding: "24px" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: 800, color: "#DC2626" }}>Confirm Application Withdrawal</h3>
            <p style={{ fontSize: "13px", color: "var(--text-sub)", lineHeight: "1.5" }}>
              Are you sure you want to withdraw application <strong>{nop.id}</strong>? This action cannot be undone and will cancel all active technical reviews.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowWithdrawModal(false)}>Keep Application</button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  handleWithdrawApplication();
                  setShowWithdrawModal(false);
                }}
                style={{ background: "#DC2626", color: "#FFFFFF", fontWeight: 700 }}
              >
                Withdraw Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lift Suspension Modal (WF-11, WF-12) */}
      {showLiftModal && (
        <div className="modal-backdrop" onClick={() => setShowLiftModal(false)} style={{ zIndex: 10000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px", background: "#FFFFFF", borderRadius: "14px", padding: "24px" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: 800, color: "#15803D" }}>Confirm Lifting of Suspension</h3>
            <p style={{ fontSize: "12.5px", color: "var(--text-sub)", lineHeight: "1.4" }}>
              Permit: <strong>{nop.id}</strong> — {nop.companyName}
            </p>
            <div style={{ marginTop: "12px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Lifting Justification / Safety Rectification Reason *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Enter safety rectification verification details..."
                value={liftReason}
                onChange={(e) => setLiftReason(e.target.value)}
                className="form-control"
                style={{ width: "100%", marginTop: "4px" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowLiftModal(false)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmLiftSuspension}
                disabled={!liftReason.trim()}
                style={{ background: "#15803D", borderColor: "#15803D", fontWeight: 700 }}
              >
                Lift Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contractor Suspension-Lifting Request Modal */}
      {showContractorLiftModal && (
        <div className="modal-backdrop" onClick={() => setShowContractorLiftModal(false)} style={{ zIndex: 10000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px", background: "#FFFFFF", borderRadius: "14px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#166534" }}>Submit Suspension-Lifting Request</h3>
              <button onClick={() => setShowContractorLiftModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}>
                <IconX size={18} strokeWidth={2} />
              </button>
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--text-sub)", lineHeight: "1.4" }}>
              Permit: <strong>{nop.id}</strong> — {nop.companyName}
            </p>
            <form onSubmit={handleRequestLiftingSubmit} style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Safety Rectification Measures Undertaken *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail the safety hazard rectifications, site inspections completed, and readiness to resume..."
                  value={contractorLiftReason}
                  onChange={(e) => setContractorLiftReason(e.target.value)}
                  className="form-control"
                  style={{ width: "100%", marginTop: "4px" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowContractorLiftModal(false)}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!contractorLiftReason.trim()}
                  style={{ background: "#166534", borderColor: "#166534", fontWeight: 700, color: "#FFFFFF" }}
                >
                  Submit Request to Liaison Officer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extension Modal */}
      {showExtensionModal && (
        <div className="modal-backdrop" onClick={() => setShowExtensionModal(false)} style={{ zIndex: 10000 }}>
          <div className="modal-content" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px", background: "#FFFFFF", color: "var(--text-main)", borderRadius: "14px", padding: "24px 28px", boxShadow: "0 25px 60px -12px rgba(0,0,0,0.28)", border: "1px solid var(--border-color)" }}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, textTransform: "none" }}>Request Permit Extension</h3>
              <button onClick={() => setShowExtensionModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}>
                <IconX size={18} strokeWidth={2} />
              </button>
            </div>
            <form onSubmit={handleExtensionSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              {extensionError && (
                <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", color: "#B91C1C", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                  <IconAlertTriangle size={14} color="#B91C1C" />
                  <span>{extensionError}</span>
                </div>
              )}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>New Extended End Date (Max 1 Month) *</label>
                <input type="date" required value={extensionEndDate} onChange={(e) => setExtensionEndDate(e.target.value)} className="form-control" style={{ width: "100%", marginTop: "4px" }} />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Extension Justification *</label>
                <textarea rows={3} required placeholder="State operational reasons..." value={extensionReason} onChange={(e) => setExtensionReason(e.target.value)} className="form-control" style={{ width: "100%", marginTop: "4px" }} />
              </div>
              <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowExtensionModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: "#FF8200", color: "#FFFFFF", fontWeight: 800 }}>Submit Extension Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspension Modal */}
      {showSuspensionModal && (
        <div className="modal-backdrop" onClick={() => setShowSuspensionModal(false)} style={{ zIndex: 10000 }}>
          <div className="modal-content" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px", background: "#FFFFFF", color: "var(--text-main)", borderRadius: "14px", padding: "24px 28px", boxShadow: "0 25px 60px -12px rgba(0,0,0,0.28)", border: "1px solid var(--border-color)" }}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#EF4444", textTransform: "none" }}>Issue Stop-Work Suspension</h3>
              <button onClick={() => setShowSuspensionModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}>
                <IconX size={18} strokeWidth={2} />
              </button>
            </div>
            <form onSubmit={handleSuspensionSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Safety Violation or Operational Ground *</label>
                <textarea rows={3} required placeholder="Specify non-compliance reasons..." value={suspensionReason} onChange={(e) => setSuspensionReason(e.target.value)} className="form-control" style={{ width: "100%", marginTop: "4px" }} />
              </div>
              <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSuspensionModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: "#EF4444", fontWeight: 800 }}>Confirm Suspension</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Supporting Document Modal */}
      {showUploadModal && (
        <div className="modal-backdrop" onClick={() => setShowUploadModal(false)} style={{ zIndex: 10000 }}>
          <div className="modal-content" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px", background: "#FFFFFF", color: "var(--text-main)", borderRadius: "14px", padding: "24px 28px", boxShadow: "0 25px 60px -12px rgba(0,0,0,0.28)", border: "1px solid var(--border-color)" }}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase" }}>Compliance Documentation</span>
                <h3 style={{ margin: "2px 0 0 0", fontSize: "16px", fontWeight: 800, textTransform: "none" }}>Upload Supporting Document</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}>
                <IconX size={18} strokeWidth={2} />
              </button>
            </div>
            <form onSubmit={handleUploadSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
              <div style={{ padding: "8px 12px", borderRadius: "8px", fontSize: "12px", background: "var(--bg-inset)" }}>
                <strong>Permit Ref:</strong> {nop.id} &bull; <strong>Contractor:</strong> {nop.companyName}
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Document Title &amp; Endorsement *</label>
                <input type="text" placeholder="e.g. Geotechnical PE Soil Settlement Calculation (Rev 2)" value={uploadDocName} onChange={(e) => setUploadDocName(e.target.value)} className="form-control" style={{ width: "100%", marginTop: "4px" }} />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Select Supporting File (PDF, PNG, JPG max 4MB) *</label>
                <label htmlFor="detail-doc-picker" style={{ display: "block", marginTop: "4px", padding: "18px 16px", border: "2px dashed #00747C", borderRadius: "8px", textAlign: "center", cursor: "pointer", background: "rgba(0, 140, 149, 0.04)" }}>
                  <input
                    id="detail-doc-picker"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.bmp,.gif"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        setUploadedFile({ name: file.name, size: (file.size / (1024 * 1024)).toFixed(1) + " MB", type: file.name.split(".").pop()?.toUpperCase() || "PDF" });
                        if (!uploadDocName) setUploadDocName(file.name.replace(/\.[^/.]+$/, ""));
                      }
                    }}
                    style={{ display: "none" }}
                  />
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px", color: "#00747C" }}>
                    <IconUploadCloud size={28} strokeWidth={1.8} />
                  </div>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--color-primary)" }}>
                    {uploadedFile ? `Attached: ${uploadedFile.name}` : "Click to select file or drag & drop"}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {uploadedFile ? `${uploadedFile.size} • ${uploadedFile.type}` : "PDF, PNG, JPG up to 4MB"}
                  </div>
                </label>
              </div>
              <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" style={{ background: "#10B981", border: "none", fontWeight: 800 }}>Verify &amp; Upload Document</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Permit Modal */}
      {showRevokeModal && (
        <div className="modal-backdrop" onClick={() => setShowRevokeModal(false)} style={{ zIndex: 10000 }}>
          <div className="modal-content" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px", background: "#FFFFFF", color: "var(--text-main)", borderRadius: "14px", padding: "24px 28px", boxShadow: "0 25px 60px -12px rgba(0,0,0,0.28)", border: "1px solid var(--border-color)" }}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#B91C1C", textTransform: "none" }}>Revoke Permit Authorization</h3>
              <button onClick={() => setShowRevokeModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}>
                <IconX size={18} strokeWidth={2} />
              </button>
            </div>
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", padding: "10px 12px", borderRadius: "8px", fontSize: "12.5px", color: "#991B1B" }}>
                <strong>Warning:</strong> Revoking permit <strong>{nop.id}</strong> immediately terminates authorization for all ongoing on-site operations. This action cannot be reversed.
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Formal Grounds for Revocation *</label>
                <textarea rows={3} required value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} className="form-control" style={{ width: "100%", marginTop: "4px" }} />
              </div>
              <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRevokeModal(false)}>Cancel</button>
                <button type="button" className="btn" onClick={executeRevokePermit} style={{ background: "#B91C1C", color: "#FFFFFF", border: "1.5px solid #B91C1C", fontWeight: 700 }}>Revoke Permit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Permit Modal */}
      {showCancelModal && (
        <div className="modal-backdrop" onClick={() => setShowCancelModal(false)} style={{ zIndex: 10000 }}>
          <div className="modal-content" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px", background: "#FFFFFF", color: "var(--text-main)", borderRadius: "14px", padding: "24px 28px", boxShadow: "0 25px 60px -12px rgba(0,0,0,0.28)", border: "1px solid var(--border-color)" }}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#D97706", textTransform: "none" }}>Request Permit Cancellation</h3>
              <button onClick={() => setShowCancelModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}>
                <IconX size={18} strokeWidth={2} />
              </button>
            </div>
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", padding: "10px 12px", borderRadius: "8px", fontSize: "12.5px", color: "#92400E" }}>
                Submit a cancellation request for permit <strong>{nop.id}</strong>. Permit Status changes to Cancelled only after Liaison Officer pre-screening and Approver decision.
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Cancellation Reason *</label>
                <textarea rows={3} required value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="form-control" style={{ width: "100%", marginTop: "4px" }} />
              </div>
              <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>Keep Active</button>
                <button type="button" className="btn" onClick={executeCancelPermit} style={{ background: "#D97706", color: "#FFFFFF", border: "1.5px solid #B45309", fontWeight: 700 }}>Submit Cancellation Request</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {previewDoc && (
        <div className="modal-backdrop" onClick={() => setPreviewDoc(null)} style={{ zIndex: 10000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", background: "#FFFFFF", borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>Document Preview: {previewDoc.name}</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => window.open(previewDoc.url)}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <IconDownload size={14} /> Download
                </button>
                <button type="button" onClick={() => setPreviewDoc(null)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                  <IconX size={20} color="var(--text-muted)" />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: "400px", background: "#F1F5F9", borderRadius: "8px", border: "1px solid #CBD5E1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center", color: "#64748B" }}>
                <IconFileText size={48} style={{ marginBottom: "12px", opacity: 0.5 }} />
                <div>Preview not available for this file type.</div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>Please download the document to view its contents.</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
