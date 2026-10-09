"use client";

import React, { Suspense, useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import LocationSelector from "@/components/LocationSelector";
import { useRole } from "@/context/RoleContext";
import { hasNopPermission } from "@/lib/nopPermissions";
import { useUnsavedChanges } from "@/context/UnsavedChangesContext";
import { isValidSingaporeUen, isValidSingaporePhone, isValidEmail } from "@/lib/nopValidators";
import {
  NOPApplication,
  NOPWorker,
  NOPDoc,
  NOPDeferredDoc,
  INITIAL_NOPS,
  STATUTORY_TRIGGERS_LIST,
  SUPPORTING_DOCUMENT_SCHEDULE,
  ROUTING_MATRIX_RULES,
  resolveApprovers,
  DomainApproval,
  getApplicableConditionalDocs,
  generateNopSequenceNumber,
  generateDraftSequenceNumber,
  getSgtDateString,
  getSgtDateTimeString,
  checkIslandBlackoutRange,
  loadStoredNops,
  fetchNopsFromMongo,
  saveStoredNops,
  recordNopAudit,
  checkIslandBlackout,
  isDeferrableWhenUrgent,
  calculateDocumentDeadline
} from "@/lib/nopData";
import { canAccessNopRecord } from "@/lib/nopPermissions";
import { getUsers } from "@/lib/users";
import { dispatchNopNotification } from "@/lib/nopNotifications";
import { IconAlertTriangle, IconCheckCircle, IconX, IconArrowLeft } from "@/components/NopIcons";
import { SENTOSA_LOCATION_PRESETS } from "@/components/BoundaryMapDrawer";

const BoundaryMapDrawer = dynamic(() => import("@/components/BoundaryMapDrawer"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "480px", background: "var(--bg-inset)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "13px" }}>
      Loading interactive boundary demarcation map...
    </div>
  )
});

interface UploadedFileItem {
  id: string;
  slotId: string;
  name: string;
  size: string;
  type: string;
}

const NEW_NOP_CANCEL_HREF = "/nops";

// FRD §4: "Equipment Type || Multi-select dropdown || Yes || e.g. Crane and
// Excavator" plus "Other Equipment Details || Free text || Conditional ||
// Required when the applicable Other equipment option is selected."
const EQUIPMENT_TYPE_OPTIONS = [
  "None",
  "Excavator (> 10 tons)",
  "Bored Piling Rig",
  "Boom Lift / MEWP",
  "Road Roller / Asphalt Paver",
  "Other"
];

function getSgtDateOnly(date: Date = new Date()): string {
  const sgt = new Date(date.getTime() + 8 * 3600 * 1000);
  return sgt.toISOString().substring(0, 10);
}

function getSgtDateFormatted(date: Date = new Date()): string {
  const sgt = new Date(date.getTime() + 8 * 3600 * 1000);
  return sgt.toISOString().substring(0, 10).replace(/-/g, "");
}

// WEB-06: Resuming a Draft NOP passes ?draftId=<id> in the URL. useSearchParams
// requires a Suspense boundary around any Client Component that calls it
// (see node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md),
// otherwise production builds fail with a "Missing Suspense boundary" error.
export default function NewNopApplicationPage() {
  return (
    <Suspense fallback={null}>
      <NewNopApplicationPageInner />
    </Suspense>
  );
}

function NewNopApplicationPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftIdParam = searchParams.get("draftId");
  const { role, username } = useRole();
  const { setDirty, setHideNav, setLeaveHref, requestLeave } = useUnsavedChanges();

  useEffect(() => {
    setHideNav(true);
    setLeaveHref(NEW_NOP_CANCEL_HREF);
    return () => {
      setHideNav(false);
      setLeaveHref(null);
      setDirty(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [nops, setNops] = useState<NOPApplication[]>([]);
  const [step, setStep] = useState<number>(1);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setNops(loadStoredNops());
  }, []);

  const showFeedback = (msg: string, type: "success" | "error" = "success") => {
    setActionFeedback({ message: msg, type });
    setTimeout(() => setActionFeedback(null), type === "error" ? 7000 : 4000);
  };

  // SDC Stakeholder Manager or Contractor applicant identification (SUB-07)
  const isStakeholderManager = role === "Stakeholder Manager";
  const currentUser = useMemo(() => {
    return getUsers().find((u) => u.name === username || u.username === username || u.role === role);
  }, [username, role]);

  const defaultCompanyName = currentUser?.company || (isStakeholderManager ? "Sentosa Development Corporation" : "Kim Seng Construction Pte Ltd");
  const defaultCompanyUen = defaultCompanyName.toLowerCase().includes("kim seng") ? "199801234K" : "T08GB0058A";
  const defaultApplicantName = currentUser?.name || username || (isStakeholderManager ? "Stakeholder Manager Tan" : "David Tan");
  const defaultApplicantEmail = currentUser?.email || (isStakeholderManager ? "manager.tan@sdc.gov.sg" : "david.tan@kimseng.sg");
  const defaultApplicantPhone = currentUser?.phone || (isStakeholderManager ? "+65 9111 0017" : "+65 9123 4567");

  // Step 1 Form State — initialized without mock data per SUB-19
  const [newForm, setNewForm] = useState({
    // Organization & PIC (SUB-07)
    companyName: defaultCompanyName,
    applicantName: defaultApplicantName,
    applicantPhone: defaultApplicantPhone,
    applicantEmail: defaultApplicantEmail,
    picName: "",
    picMobile: "",
    picOfficeNumber: "",
    sdcLiaisonOfficer: "",
    loEmail: "",
    loMobile: "",
    emergencyContactName1: "",
    emergencyContactMobile1: "",
    emergencyContactName2: "",
    emergencyContactMobile2: "",
    privacyPolicyAgreed: false,

    // Work Details & Schedule (SUB-19)
    workDescription: "",
    durationCategory: "BAU Maintenance" as "BAU Maintenance" | "Ad-hoc Work" | "Project Work",
    projectTitle: "",
    startDate: getSgtDateOnly(new Date(Date.now() + 86400000 * 2)),
    endDate: getSgtDateOnly(new Date(Date.now() + 86400000 * 5)),
    dailyStartTime: "08:00",
    dailyEndTime: "18:00",

    // Blackout & Night Works
    workingOnBlackoutDates: false,
    blackoutWorkReason: "",
    nightWorkInvolved: false,
    nightWorkReason: "",
    nightWorkAcknowledged: false,
    applicantRemarks: "",

    // High-Risk Work Fields (SUB-16)
    confinedSpaceInvolved: false,
    scaffoldingInvolved: "" as string, // "" | "Yes" | "No"
    excavationDepth: "",
    liftingOperations: false,
    equipmentType: [] as string[],
    otherEquipment: "",
    vehicleType: "",

    // Location of Works (SUB-19)
    roadName: "",
    buildingCommonName: "",
    postalCode: "",
    level: "",
    unitRoomNumber: "",
    spaceDescription: "",
    locationTags: [] as string[],

    declarationChecked: false
  });

  const [newCustomTag, setNewCustomTag] = useState("");

  // SUB-06: Active Liaison Officer list
  const activeLoUsers = useMemo(() => {
    return getUsers().filter((u) => u.role === "Liaison Officer" && u.status === "Active");
  }, []);

  // SUB-19: Boundary, uploads, and workers start empty for new forms
  const [boundaryPoints, setBoundaryPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [boundaryTouched, setBoundaryTouched] = useState(false);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [workersList, setWorkersList] = useState<NOPWorker[]>([]);

  const [newWorker, setNewWorker] = useState<Partial<NOPWorker> & { tradeOccupation?: string }>({
    name: "",
    role: "General Worker",
    tradeOccupation: "General Labourer",
    passType: "Work Permit",
    employerCompany: defaultCompanyName,
    workPermitNumber: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formTopRef = useRef<HTMLDivElement>(null);

  // WEB-06 & SEC-10: id of the Draft NOP currently being resumed/edited
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [draftLoadError, setDraftLoadError] = useState<string | null>(null);
  const draftHydratedRef = useRef(false);
  const [draftHydrating, setDraftHydrating] = useState(Boolean(draftIdParam));

  const [activeSection, setActiveSection] = useState<"A" | "A2" | "B" | "C" | "D">("A2");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    A: false,
    A2: true,
    B: true,
    C: true,
    D: true
  });

  // SUB-07: Section A requires PIC Name and PIC Mobile
  const sectionAComplete = Boolean(
    newForm.companyName &&
    newForm.applicantName &&
    newForm.applicantPhone &&
    isValidSingaporePhone(newForm.applicantPhone) &&
    newForm.applicantEmail &&
    isValidEmail(newForm.applicantEmail) &&
    newForm.picName.trim() &&
    newForm.picMobile.trim() &&
    isValidSingaporePhone(newForm.picMobile) &&
    newForm.sdcLiaisonOfficer.trim()
  );
  const sectionA2Complete = Boolean(
    newForm.emergencyContactName1.trim() &&
    newForm.emergencyContactMobile1.trim() &&
    isValidSingaporePhone(newForm.emergencyContactMobile1) &&
    (!newForm.emergencyContactName2.trim() || (newForm.emergencyContactMobile2.trim() && isValidSingaporePhone(newForm.emergencyContactMobile2)))
  );
  const sectionBComplete = Boolean(newForm.workDescription && newForm.startDate && newForm.endDate && newForm.projectTitle && newForm.dailyStartTime && newForm.dailyEndTime);
  // SUB-16: Section C requires explicit choice for Equipment Type, Scaffolding, and Vehicle Type
  const sectionCComplete = Boolean(
    newForm.equipmentType.length > 0 &&
    newForm.scaffoldingInvolved !== "" &&
    Boolean(newForm.vehicleType) &&
    (!newForm.workingOnBlackoutDates || newForm.blackoutWorkReason.trim().length > 0) &&
    (!newForm.nightWorkInvolved || (newForm.nightWorkReason.trim().length > 0 && newForm.nightWorkAcknowledged))
  );
  const sectionDComplete = Boolean(newForm.roadName && newForm.buildingCommonName && newForm.postalCode && newForm.level && (newForm.spaceDescription || newForm.unitRoomNumber));
  const completedSectionsCount = [sectionAComplete, sectionA2Complete, sectionBComplete, sectionCComplete, sectionDComplete].filter(Boolean).length;

  useEffect(() => {
    if (!draftIdParam || draftHydratedRef.current) {
      if (draftHydrating) setDraftHydrating(false);
      return;
    }
    const storedNops = loadStoredNops();
    // SEC-10: Strict exact matching on draftId & ownership verification
    const draft =
      storedNops.find((n) => n.id === draftIdParam && n.applicationStatus === "Draft") ||
      INITIAL_NOPS.find((n) => n.id === draftIdParam && n.applicationStatus === "Draft");

    const hasAccess = Boolean(draft && canAccessNopRecord({
      role,
      username,
      email: currentUser?.email,
      companyName: currentUser?.company,
      canActAsApplicant: currentUser?.canActAsApplicant
    }, draft));

    if (!draft || !hasAccess) {
      setDraftHydrating(false);
      setDraftLoadError("Không tìm thấy draft hoặc bạn không có quyền truy cập hồ sơ này.");
      return;
    }

    draftHydratedRef.current = true;
    setEditingDraftId(draft.id);

    // Reverse of handleSaveDraft's `startDateTime: \`${startDate}T${dailyStartTime}:00Z\`` construction.
    const [savedStartDate, savedStartTimeRaw] = (draft.startDateTime || "").split("T");
    const [savedEndDate, savedEndTimeRaw] = (draft.endDateTime || "").split("T");

    // SUB-04 & SUB-05: Restore exact fields without falling back to mock values
    setNewForm({
      companyName: draft.companyName || defaultCompanyName,
      applicantName: draft.applicantName || defaultApplicantName,
      applicantPhone: draft.applicantPhone || defaultApplicantPhone,
      applicantEmail: draft.applicantEmail || defaultApplicantEmail,
      picName: draft.picName || "",
      picMobile: draft.picMobile || "",
      picOfficeNumber: draft.picOfficeNumber || "",
      sdcLiaisonOfficer: draft.sdcLiaisonOfficer || "",
      loEmail: draft.loEmail || "",
      loMobile: draft.loMobile || "",
      emergencyContactName1: draft.emergencyContactName1 || "",
      emergencyContactMobile1: draft.emergencyContactMobile1 || "",
      emergencyContactName2: draft.emergencyContactName2 || "",
      emergencyContactMobile2: draft.emergencyContactMobile2 || "",
      privacyPolicyAgreed: false,

      workDescription: draft.workDescription || "",
      durationCategory: draft.durationCategory || "BAU Maintenance",
      projectTitle: draft.projectTitle || "",
      startDate: savedStartDate || draft.startDateTime?.substring(0, 10) || getSgtDateOnly(),
      endDate: savedEndDate || draft.endDateTime?.substring(0, 10) || getSgtDateOnly(new Date(Date.now() + 86400000 * 3)),
      dailyStartTime: savedStartTimeRaw ? savedStartTimeRaw.substring(0, 5) : "08:00",
      dailyEndTime: savedEndTimeRaw ? savedEndTimeRaw.substring(0, 5) : "18:00",

      workingOnBlackoutDates: Boolean(draft.workingOnBlackoutDates),
      blackoutWorkReason: draft.blackoutWorkReason || "",
      nightWorkInvolved: draft.nightWorkInvolved !== undefined ? Boolean(draft.nightWorkInvolved) : false,
      nightWorkReason: draft.nightWorkReason || "",
      nightWorkAcknowledged: Boolean(draft.nightWorkAcknowledged),
      applicantRemarks: draft.applicantRemarks || "",

      confinedSpaceInvolved: Boolean(draft.confinedSpaceInvolved),
      scaffoldingInvolved: draft.scaffoldingInvolved === true ? "Yes" : draft.scaffoldingInvolved === false ? "No" : (draft.scaffoldingInvolved || ""),
      excavationDepth: draft.excavationDepth || "",
      liftingOperations: Boolean(draft.liftingOperations),
      equipmentType: draft.equipmentType || [],
      otherEquipment: draft.otherEquipment || "",
      vehicleType: draft.vehicleType || "",

      roadName: draft.roadName || "",
      buildingCommonName: draft.buildingCommonName || "",
      postalCode: draft.postalCode || "",
      level: draft.level || "",
      unitRoomNumber: draft.unitRoomNumber || "",
      spaceDescription: draft.spaceDescription || "",
      locationTags: draft.locationTags || [],
      declarationChecked: false
    });

    if (draft.triggers && draft.triggers.length > 0) setSelectedTriggers(draft.triggers);

    if (draft.boundaryCoordinates && draft.boundaryCoordinates.length >= 3) {
      setBoundaryPoints(draft.boundaryCoordinates);
      setBoundaryTouched(true);
    }

    if (draft.workers && draft.workers.length > 0) setWorkersList(draft.workers);

    if (draft.documents && draft.documents.length > 0) {
      const restoredUploads = draft.documents.map((d: NOPDoc) => {
        const lowerName = d.name.toLowerCase();
        const scheduleMatch = SUPPORTING_DOCUMENT_SCHEDULE.find(
          (s) => lowerName.includes(s.name.toLowerCase()) || lowerName.includes(s.description.toLowerCase())
        );
        return {
          id: d.id,
          slotId: d.slotId || scheduleMatch?.id || `unmatched-${d.id}`,
          name: d.name,
          size: d.fileSize || "—",
          type: d.type
        };
      });
      setUploadedFiles(restoredUploads);
    }
    setDraftHydrating(false);
  }, [draftIdParam, role, username]);

  // SUB-08: Urgency calculation in Singapore Timezone (SGT)
  const urgencyAnalysis = useMemo(() => {
    if (!newForm.startDate) return { isUrgent: false, isPast: false, diffDays: 0 };
    const todaySgtStr = getSgtDateOnly(new Date());
    const todayDays = Math.floor(new Date(todaySgtStr + "T00:00:00Z").getTime() / 86400000);
    const startDays = Math.floor(new Date(newForm.startDate + "T00:00:00Z").getTime() / 86400000);
    const diffDays = startDays - todayDays;
    return {
      isUrgent: diffDays >= 0 && diffDays < 7,
      isPast: diffDays < 0,
      diffDays
    };
  }, [newForm.startDate]);

  const isUrgent = urgencyAnalysis.isUrgent;

  // Check Island Blackout Overlap (checks start date, end date, and dates in between)
  const blackoutCheck = useMemo(() => {
    if (!newForm.startDate) return { isBlackout: false };
    const startRes = checkIslandBlackout(newForm.startDate);
    if (startRes.isBlackout) return startRes;
    if (newForm.endDate) {
      const endRes = checkIslandBlackout(newForm.endDate);
      if (endRes.isBlackout) return endRes;
      try {
        const start = new Date(newForm.startDate).getTime();
        const end = new Date(newForm.endDate).getTime();
        for (let t = start + 86400000; t < end; t += 86400000) {
          const midStr = new Date(t).toISOString().substring(0, 10);
          const midRes = checkIslandBlackout(midStr);
          if (midRes.isBlackout) return midRes;
        }
      } catch {}
    }
    return { isBlackout: false };
  }, [newForm.startDate, newForm.endDate]);

  // SUB-01 & SUB-02: Conditional docs with scaffolding and lifting
  const applicableConditionalDocs = useMemo(() => {
    return getApplicableConditionalDocs(
      selectedTriggers,
      Number(newForm.excavationDepth),
      newForm.scaffoldingInvolved === "Yes",
      newForm.liftingOperations
    );
  }, [selectedTriggers, newForm.excavationDepth, newForm.scaffoldingInvolved, newForm.liftingOperations]);

  if (draftLoadError) {
    return (
      <div className="page-content" style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ background: "#FFFFFF", border: "1px dashed #FECACA", borderRadius: "12px", padding: "40px", maxWidth: "540px", margin: "0 auto", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.05)" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "24px", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto", color: "#DC2626", fontSize: "22px", fontWeight: 700 }}>
            ✕
          </div>
          <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#991B1B", marginBottom: "8px" }}>
            Không tìm thấy draft
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px", lineHeight: 1.5 }}>
            {draftLoadError}
          </p>
          <Link href="/nops" className="btn btn-secondary btn-sm" style={{ fontWeight: 700, padding: "8px 16px" }}>
            Quay lại NOP List
          </Link>
        </div>
      </div>
    );
  }

  if (!hasNopPermission(role, "nop.apply")) {
    return (
      <div style={{ background: "#FFFFFF", border: "1px dashed var(--border-color)", borderRadius: "12px", padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>Access Denied</div>
        <div style={{ fontSize: "13px", marginBottom: "12px" }}>
          You don&apos;t have permission to submit a NOP application.
        </div>
        <Link href="/nops" className="btn btn-secondary btn-sm" style={{ marginTop: "8px", display: "inline-flex" }}>Back to NOP List</Link>
      </div>
    );
  }

  // Handlers for Worker Muster List (SUB-18)
  const handleAddWorker = () => {
    if (!newWorker.name?.trim()) {
      showFeedback("Worker Name is required.", "error");
      return;
    }
    if (!newWorker.tradeOccupation?.trim()) {
      showFeedback("Trade or Occupation is required.", "error");
      return;
    }
    if (!newWorker.employerCompany?.trim()) {
      showFeedback("Employer Company is required.", "error");
      return;
    }
    if (!newWorker.workPermitNumber?.trim()) {
      showFeedback("Work Permit / Pass Number is required.", "error");
      return;
    }

    const createdWorker: NOPWorker = {
      id: `w-${Date.now()}`,
      name: newWorker.name.trim(),
      role: newWorker.role || "General Worker",
      tradeOccupation: newWorker.tradeOccupation.trim(),
      passType: newWorker.passType || "Work Permit",
      verified: true,
      employerCompany: newWorker.employerCompany.trim(),
      workPermitNumber: newWorker.workPermitNumber.trim()
    };
    setWorkersList([...workersList, createdWorker]);
    setNewWorker({
      name: "",
      role: "General Worker",
      tradeOccupation: "General Labourer",
      passType: "Work Permit",
      employerCompany: newForm.companyName,
      workPermitNumber: ""
    });
  };

  const handleRemoveWorker = (wId: string) => {
    setWorkersList(workersList.filter((w) => w.id !== wId));
  };

  // Step 1 Validation (SUB-07, SUB-08, SUB-16, SUB-20)
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!newForm.companyName.trim()) errs.companyName = "Company Name is required.";
    if (!newForm.applicantName.trim()) errs.applicantName = "Applicant Name is required.";
    if (!newForm.applicantPhone.trim() || !isValidSingaporePhone(newForm.applicantPhone)) {
      errs.applicantPhone = "Valid Singapore mobile number required for Applicant.";
    }
    if (!newForm.applicantEmail.trim() || !isValidEmail(newForm.applicantEmail)) {
      errs.applicantEmail = "Valid corporate email address required for Applicant.";
    }

    // SUB-07: Mandatory PIC Name and PIC Mobile
    if (!newForm.picName.trim()) errs.picName = "Person-in-Charge (PIC) Name is required.";
    if (!newForm.picMobile.trim() || !isValidSingaporePhone(newForm.picMobile)) {
      errs.picMobile = "Valid Singapore mobile phone number required for PIC.";
    }

    if (!newForm.sdcLiaisonOfficer.trim()) errs.sdcLiaisonOfficer = "SDC Liaison Officer must be selected.";

    // FRD §4 Emergency Contact Details
    if (!newForm.emergencyContactName1.trim()) errs.emergencyContactName1 = "Emergency Contact Name #1 is required.";
    if (!newForm.emergencyContactMobile1.trim() || !isValidSingaporePhone(newForm.emergencyContactMobile1)) {
      errs.emergencyContactMobile1 = "Valid Singapore mobile number required for Emergency Contact #1.";
    }
    if (newForm.emergencyContactName2.trim() && !newForm.emergencyContactMobile2.trim()) {
      errs.emergencyContactMobile2 = "Emergency Contact Mobile #2 is required when Emergency Contact Name #2 is entered.";
    }
    if (newForm.emergencyContactMobile2.trim() && !isValidSingaporePhone(newForm.emergencyContactMobile2)) {
      errs.emergencyContactMobile2 = "Valid Singapore mobile number required for Emergency Contact #2.";
    }

    if (!newForm.workDescription.trim()) errs.workDescription = "Scope of Work Description is required.";
    if (!newForm.startDate) errs.startDate = "Work Start Date is required.";
    if (!newForm.endDate) errs.endDate = "Work End Date is required.";

    // SUB-08 & SUB-20: SGT-based start date validation; past start dates blocked
    if (newForm.startDate) {
      if (urgencyAnalysis.isPast) {
        errs.startDate = "Work Start Date cannot be in the past.";
      }
    }
    if (newForm.startDate && newForm.endDate && new Date(newForm.endDate) < new Date(newForm.startDate)) {
      errs.endDate = "End Date cannot be earlier than Start Date.";
    }

    // SUB-20: Working hours validation (both required; overnight shifts allowed)
    if (!newForm.dailyStartTime) errs.dailyStartTime = "Daily Start Time is required.";
    if (!newForm.dailyEndTime) errs.dailyEndTime = "Daily End Time is required.";

    // FRD §4: Project Title is mandatory for every NOP application
    if (!newForm.projectTitle.trim()) errs.projectTitle = "Project Title is required.";

    // Duration limit checks
    if (!errs.startDate && !errs.endDate && newForm.startDate && newForm.endDate) {
      const start = new Date(newForm.startDate);
      const end = new Date(newForm.endDate);
      if (newForm.durationCategory === "BAU Maintenance" || newForm.durationCategory === "Ad-hoc Work") {
        const maxEnd = new Date(start);
        maxEnd.setMonth(maxEnd.getMonth() + 6);
        if (end > maxEnd) {
          errs.endDate = `${newForm.durationCategory} permits cannot exceed 6 months from the start date.`;
        }
      } else if (newForm.durationCategory === "Project Work") {
        const maxEnd = new Date(start);
        maxEnd.setFullYear(maxEnd.getFullYear() + 3);
        if (end > maxEnd) {
          errs.endDate = "Project Work permits cannot exceed 3 years from the start date.";
        }
      }
    }

    // Blackout reason required if working on blackout dates
    if (newForm.workingOnBlackoutDates && !newForm.blackoutWorkReason.trim()) {
      errs.blackoutWorkReason = "Please provide justification for carrying out works on island blackout dates.";
    }

    // Night works reason & agreement
    if (newForm.nightWorkInvolved) {
      if (!newForm.nightWorkReason.trim()) {
        errs.nightWorkReason = "Night work operational justification is required.";
      }
      if (!newForm.nightWorkAcknowledged) {
        errs.nightWorkAcknowledged = "You must agree to SDC Night Works noise and safety guidelines.";
      }
    }

    // SUB-16: Scaffolding explicit choice
    if (newForm.scaffoldingInvolved === "") {
      errs.scaffoldingInvolved = "Please explicitly choose whether scaffolding is involved (Yes or No).";
    }

    // SUB-16: Vehicle Type explicit choice
    if (!newForm.vehicleType) {
      errs.vehicleType = "Please select Site Vehicle Type (or 'None').";
    }

    // SUB-16: Equipment Type explicit selection
    if (newForm.equipmentType.length === 0) {
      errs.equipmentType = "Please select at least one Equipment Type (or 'None').";
    }
    if (newForm.equipmentType.includes("Other") && !newForm.otherEquipment.trim()) {
      errs.otherEquipment = "Other Equipment Details is required when Other is selected as an Equipment Type.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (selectedTriggers.length === 0) errs.triggers = "Select at least one Work Involvement / Statutory Trigger.";

    // Conditional Excavation Depth Validation
    if (selectedTriggers.includes("Excavation Work")) {
      if (!newForm.excavationDepth.trim()) {
        errs.excavationDepth = "Excavation Depth is mandatory when Excavation Work is selected.";
      } else if (isNaN(Number(newForm.excavationDepth)) || Number(newForm.excavationDepth) <= 0) {
        errs.excavationDepth = "Excavation Depth must be a valid positive number in metres.";
      }
    }

    // Conditional Scaffolding Validation
    if (selectedTriggers.includes("Working at Height Above 30 Metres")) {
      if (!newForm.scaffoldingInvolved || newForm.scaffoldingInvolved === "") {
        errs.scaffoldingInvolved = "Please select whether scaffolding is involved (Yes or No).";
      }
    }

    // FRD §4 Location of Works: Road, Building - Common Name, Building - Postal Code, Level and Space are all mandatory.
    if (!newForm.roadName.trim()) errs.roadName = "Road is required.";
    if (!newForm.buildingCommonName.trim()) errs.buildingCommonName = "Building Common Name is required.";
    if (!newForm.postalCode.trim()) errs.postalCode = "Building Postal Code is required.";
    if (!newForm.level.trim()) errs.level = "Level is required.";
    if (!newForm.unitRoomNumber.trim() && !newForm.spaceDescription.trim()) {
      errs.spaceDescription = "Space (unit, room, corridor, loading bay or lift lobby) is required.";
    }

    // SUB-19: Must draw actual boundary on map
    if (!boundaryTouched || boundaryPoints.length < 3) {
      errs.boundary = "Please draw the actual work boundary on the map before proceeding.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    const baselineSlots = SUPPORTING_DOCUMENT_SCHEDULE.filter((d) => d.category === "Baseline");
    const missingDocs = baselineSlots.filter((slot) => !uploadedFiles.some((u) => u.slotId === slot.id));
    if (missingDocs.length > 0) {
      errs.documents = `All baseline supporting documents are required. Missing: ${missingDocs.map((m) => m.name).join(", ")}`;
    }

    // FRD §4 & SUB-01/02: Conditional docs validation (deferrable skipped when urgent)
    const missingConditional = applicableConditionalDocs.filter(
      (slot) => !(isUrgent && isDeferrableWhenUrgent(slot.id)) && !uploadedFiles.some((u) => u.slotId === slot.id)
    );
    if (missingConditional.length > 0) {
      errs.conditionalDocuments = `Required conditional documents missing: ${missingConditional.map((m) => m.name).join(", ")}`;
    }
    if (workersList.length === 0) {
      errs.workers = "At least one site personnel / PIC must be registered in the worker muster.";
    }
    if (!newForm.declarationChecked) {
      errs.declaration = "You must acknowledge and sign the statutory safety declaration.";
    }
    if (!newForm.privacyPolicyAgreed) {
      errs.privacyPolicyAgreed = "You must agree to the SDC Privacy Policy before submission.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step Transition Handler
  const handleNextStep = () => {
    if (step === 1) {
      if (!validateStep1()) {
        showFeedback("Please resolve the highlighted validation errors before proceeding.", "error");
        formTopRef.current?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      setErrors({});
      setStep(2);
      formTopRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (step === 2) {
      if (!validateStep2()) {
        showFeedback("Please complete the location and trigger selections.", "error");
        formTopRef.current?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      setErrors({});
      setStep(3);
      formTopRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Save Draft (SUB-04, SUB-22)
  const handleSaveDraft = () => {
    // SUB-22: Drafts use DRAFT-NNN id format
    const draftSeq = generateDraftSequenceNumber(nops);
    const draftId = editingDraftId || `DRAFT-${draftSeq}`;

    const newDraft: NOPApplication = {
      id: draftId,
      companyName: newForm.companyName,
      applicantName: newForm.applicantName,
      applicantPhone: newForm.applicantPhone,
      applicantEmail: newForm.applicantEmail,
      creatorUsername: username || newForm.applicantName,
      creatorEmail: currentUser?.email || newForm.applicantEmail,
      picName: newForm.picName,
      picMobile: newForm.picMobile,
      picOfficeNumber: newForm.picOfficeNumber,
      sdcLiaisonOfficer: newForm.sdcLiaisonOfficer,
      loEmail: newForm.loEmail,
      loMobile: newForm.loMobile,
      emergencyContactName1: newForm.emergencyContactName1,
      emergencyContactMobile1: newForm.emergencyContactMobile1,
      emergencyContactName2: newForm.emergencyContactName2,
      emergencyContactMobile2: newForm.emergencyContactMobile2,
      applicantRemarks: newForm.applicantRemarks,
      projectTitle: newForm.projectTitle,
      workDescription: newForm.workDescription || "",
      durationCategory: newForm.durationCategory,
      location: [newForm.buildingCommonName, newForm.roadName].filter(Boolean).join(", ") || "Unknown Location",
      roadName: newForm.roadName,
      buildingCommonName: newForm.buildingCommonName,
      postalCode: newForm.postalCode,
      level: newForm.level,
      unitRoomNumber: newForm.unitRoomNumber,
      spaceDescription: newForm.spaceDescription,
      locationTags: newForm.locationTags,
      startDateTime: `${newForm.startDate}T${newForm.dailyStartTime}:00+08:00`,
      endDateTime: `${newForm.endDate}T${newForm.dailyEndTime}:00+08:00`,
      workingHours: `${newForm.dailyStartTime} – ${newForm.dailyEndTime}`,
      workingOnBlackoutDates: newForm.workingOnBlackoutDates,
      blackoutWorkReason: newForm.blackoutWorkReason,
      nightWorkInvolved: newForm.nightWorkInvolved,
      nightWorkReason: newForm.nightWorkReason,
      nightWorkAcknowledged: newForm.nightWorkAcknowledged,
      confinedSpaceInvolved: newForm.confinedSpaceInvolved,
      scaffoldingInvolved: newForm.scaffoldingInvolved === "Yes",
      excavationDepth: newForm.excavationDepth,
      liftingOperations: newForm.liftingOperations,
      equipmentType: newForm.equipmentType,
      otherEquipment: newForm.otherEquipment,
      vehicleType: newForm.vehicleType,
      isUrgent,
      hasBlackoutOverlap: blackoutCheck.isBlackout,
      blackoutReason: blackoutCheck.reason,
      applicationStatus: "Draft",
      permitStatus: "Upcoming",
      ipaStatus: "N/A",
      documentCompletion: "Documents Outstanding",
      triggers: selectedTriggers,
      documents: uploadedFiles.map((u) => ({
        id: u.id,
        slotId: u.slotId,
        name: u.name,
        type: u.type,
        status: "Under Review",
        uploadedAt: getSgtDateOnly(),
        fileSize: u.size
      })),
      workers: workersList,
      loPreScreenStatus: "Pending Pre-screening",
      domainApprovals: [],
      boundaryCoordinates: boundaryPoints,
      submittedAt: `Saved as Draft on ${getSgtDateOnly()}`
    };

    const updated = editingDraftId
      ? nops.map((n) => (n.id === editingDraftId ? newDraft : n))
      : [newDraft, ...nops];
    setNops(updated);
    saveStoredNops(updated);
    showFeedback(`Application draft ${draftId} saved successfully.`);
    setDirty(false);
    router.push("/nops");
  };

  // Submit NOP Application (SUB-08, SUB-22, DOC-07)
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      showFeedback("Please resolve all highlighted validation errors, location boundary, and declarations before submission.", "error");
      return;
    }

    const sgtTodayFormatted = getSgtDateString();
    // SUB-22: Submitted NOP reference uses SGT date
    const seq = generateNopSequenceNumber(nops, sgtTodayFormatted);
    const newId = `SEN/NP/${sgtTodayFormatted}/${seq}`;

    // DOC-07: Generate deferredSlots for missing deferrable docs when urgent
    const deferredSlots: NOPDeferredDoc[] = applicableConditionalDocs
      .filter((slot) => isUrgent && isDeferrableWhenUrgent(slot.id) && !uploadedFiles.some((u) => u.slotId === slot.id))
      .map((slot) => {
        const rule = ROUTING_MATRIX_RULES.find((r) => slot.requiredForTrigger && r.trigger.toLowerCase().includes(slot.requiredForTrigger.toLowerCase()));
        return {
          id: `def-${Date.now()}-${slot.id}`,
          slotId: slot.id,
          name: slot.name,
          category: slot.category,
          status: "Pending Submission",
          dueDate: calculateDocumentDeadline(new Date().toISOString(), 3),
          assignedGroup: rule ? rule.approverGroup : "Operations Resilience & WSH"
        };
      });

    const isAllComplete = deferredSlots.length === 0;

    const domainApprovals: DomainApproval[] = resolveApprovers(selectedTriggers);

    const createdNop: NOPApplication = {
      id: newId,
      companyName: newForm.companyName,
      applicantName: newForm.applicantName,
      applicantPhone: newForm.applicantPhone,
      applicantEmail: newForm.applicantEmail,
      creatorUsername: username || newForm.applicantName,
      creatorEmail: currentUser?.email || newForm.applicantEmail,
      picName: newForm.picName,
      picMobile: newForm.picMobile,
      picOfficeNumber: newForm.picOfficeNumber,
      sdcLiaisonOfficer: newForm.sdcLiaisonOfficer,
      loEmail: newForm.loEmail,
      loMobile: newForm.loMobile,
      emergencyContactName1: newForm.emergencyContactName1,
      emergencyContactMobile1: newForm.emergencyContactMobile1,
      emergencyContactName2: newForm.emergencyContactName2,
      emergencyContactMobile2: newForm.emergencyContactMobile2,
      applicantRemarks: newForm.applicantRemarks,
      projectTitle: newForm.projectTitle,
      workDescription: newForm.workDescription,
      durationCategory: newForm.durationCategory,
      location: [newForm.buildingCommonName, newForm.roadName].filter(Boolean).join(", ") || "Unknown Location",
      roadName: newForm.roadName,
      buildingCommonName: newForm.buildingCommonName,
      postalCode: newForm.postalCode,
      level: newForm.level,
      unitRoomNumber: newForm.unitRoomNumber,
      spaceDescription: newForm.spaceDescription,
      locationTags: newForm.locationTags,
      startDateTime: `${newForm.startDate}T${newForm.dailyStartTime}:00+08:00`,
      endDateTime: `${newForm.endDate}T${newForm.dailyEndTime}:00+08:00`,
      workingHours: `${newForm.dailyStartTime} – ${newForm.dailyEndTime}`,
      workingOnBlackoutDates: newForm.workingOnBlackoutDates,
      blackoutWorkReason: newForm.blackoutWorkReason,
      nightWorkInvolved: newForm.nightWorkInvolved,
      nightWorkReason: newForm.nightWorkReason,
      nightWorkAcknowledged: newForm.nightWorkAcknowledged,
      confinedSpaceInvolved: newForm.confinedSpaceInvolved,
      scaffoldingInvolved: newForm.scaffoldingInvolved === "Yes",
      excavationDepth: newForm.excavationDepth,
      liftingOperations: newForm.liftingOperations,
      equipmentType: newForm.equipmentType,
      otherEquipment: newForm.otherEquipment,
      vehicleType: newForm.vehicleType,
      isUrgent,
      hasBlackoutOverlap: blackoutCheck.isBlackout,
      blackoutReason: blackoutCheck.reason,
      applicationStatus: "Under Review",
      permitStatus: "Upcoming",
      ipaStatus: isUrgent ? "Pending" : "N/A",
      documentCompletion: isAllComplete ? "Documents Complete" : "Documents Outstanding",
      deferredDocuments: deferredSlots.length > 0 ? deferredSlots : undefined,
      triggers: selectedTriggers,
      documents: uploadedFiles.map((u) => ({
        id: u.id,
        slotId: u.slotId,
        name: u.name,
        type: u.type,
        status: "Under Review",
        uploadedAt: getSgtDateOnly(),
        fileSize: u.size
      })),
      workers: workersList,
      loPreScreenStatus: "Pending Pre-screening",
      domainApprovals,
      boundaryCoordinates: boundaryPoints,
      submittedAt: getSgtDateTimeString()
    };

    const updated = editingDraftId
      ? [createdNop, ...nops.filter((n) => n.id !== editingDraftId)]
      : [createdNop, ...nops];
    setNops(updated);
    saveStoredNops(updated);

    recordNopAudit({
      nopId: newId,
      action: "SUBMIT_APPLICATION",
      actor: username,
      role: role || "Applicant (Contractor)",
      comment: `New application submitted for ${createdNop.workDescription}. Routed to LO ${createdNop.sdcLiaisonOfficer}. Urgent: ${createdNop.isUrgent ? "Yes" : "No"}. Requested start: ${createdNop.startDateTime}.`
    });

    dispatchNopNotification({ triggerCode: "NOTIF-01", nopId: newId, content: `NOP Application ${newId} submitted by ${createdNop.applicantName} (${createdNop.companyName}).` });

    showFeedback(`Application ${newId} submitted successfully to Liaison Officer.`);
    setDirty(false);
    router.push(`/nops/${newId}`);
  };

  const STEP_LABELS = [
    "Organization & Scope of Work",
    "Location & Work Involvements",
    "Documents & Personnel Muster"
  ];

  if (draftHydrating) {
    return (
      <div style={{ maxWidth: "1200px", margin: "40px auto", padding: "40px 20px", textAlign: "center", background: "#FFFFFF", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
        <div style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", marginBottom: "8px" }}>
          Loading Draft Application…
        </div>
        <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
          Hydrating saved application fields, boundary demarcation, and statutory documents for editing.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toast Notification Banner */}
      {actionFeedback && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#0F172A",
            color: "#FFFFFF",
            padding: "12px 16px 12px 20px",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            fontSize: "13px",
            fontWeight: 600,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            maxWidth: "420px",
            border: actionFeedback.type === "error" ? "1.5px solid #EF4444" : "1.5px solid #10B981",
            animation: "fadeIn 0.2s ease-out"
          }}
        >
          {actionFeedback.type === "error" ? (
            <IconAlertTriangle size={16} color="#F87171" />
          ) : (
            <IconCheckCircle size={16} color="#10B981" />
          )}
          <span style={{ flex: 1 }}>{actionFeedback.message}</span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            aria-label="Dismiss notification"
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: "2px", display: "flex", flexShrink: 0 }}
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      <div className="page-header-bar glass">
        <div className="title-section">
          <button
            type="button"
            onClick={() => requestLeave(() => router.push("/nops"))}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: "11.5px", display: "inline-flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}
          >
            <IconArrowLeft size={13} />
            <span>Back to NOP List</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>No Objection Permit</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>/</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>NOP Application Register</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>/</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#EA580C" }}>New Application</span>
          </div>
          <h1 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-main)", margin: "4px 0" }}>New NOP Application</h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>Submit a new No Objection Permit application for statutory review and approval.</p>
        </div>
      </div>

      <div className="glass" style={{ padding: "24px" }}>

            {/* Error Summary Alert Banner */}
            {Object.keys(errors).length > 0 && (
              <div style={{ marginTop: "14px", background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: "8px", padding: "12px 16px", color: "#991B1B", fontSize: "12.5px" }}>
                <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <IconAlertTriangle size={15} color="#B91C1C" />
                  <span>Please resolve the following errors:</span>
                </div>
                <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: "12px" }}>
                  {Object.values(errors).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} onChangeCapture={() => setDirty(true)} style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Step 1 Sub-stepper Bar (matching media_1790222567486.png & media_1790222521181.png) */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "4px", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                      <button
                        type="button"
                        onClick={() => { setActiveSection("A"); setExpandedSections(prev => ({ ...prev, A: !prev.A })); }}
                        style={{
                          background: "none",
                          border: "none",
                          borderBottom: activeSection === "A" ? "2px solid #FF8200" : "2px solid transparent",
                          paddingBottom: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          color: activeSection === "A" ? "#FF8200" : sectionAComplete ? "#15803D" : "var(--text-muted)",
                          cursor: "pointer"
                        }}
                      >
                        <span style={{ color: "#16A34A" }}>✓</span>
                        <span>A. Applicant &amp; PIC</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setActiveSection("A2"); setExpandedSections(prev => ({ ...prev, A2: !prev.A2 })); }}
                        style={{
                          background: "none",
                          border: "none",
                          borderBottom: activeSection === "A2" ? "2px solid #FF8200" : "2px solid transparent",
                          paddingBottom: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          color: activeSection === "A2" ? "#FF8200" : sectionA2Complete ? "#15803D" : "var(--text-muted)",
                          cursor: "pointer"
                        }}
                      >
                        <span style={{ width: 16, height: 16, minWidth: 16, minHeight: 16, borderRadius: "50%", border: activeSection === "A2" ? "2px solid #FF8200" : "2px solid #CBD5E1", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: activeSection === "A2" ? "#FF8200" : "#64748B", flexShrink: 0, lineHeight: 1, boxSizing: "border-box" }}>
                          {sectionA2Complete ? "✓" : "2"}
                        </span>
                        <span>A2. Emergency contact</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setActiveSection("B"); setExpandedSections(prev => ({ ...prev, B: !prev.B })); }}
                        style={{
                          background: "none",
                          border: "none",
                          borderBottom: activeSection === "B" ? "2px solid #FF8200" : "2px solid transparent",
                          paddingBottom: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          color: activeSection === "B" ? "#FF8200" : sectionBComplete ? "#15803D" : "var(--text-muted)",
                          cursor: "pointer"
                        }}
                      >
                        <span style={{ width: 16, height: 16, minWidth: 16, minHeight: 16, borderRadius: "50%", border: activeSection === "B" ? "2px solid #FF8200" : "2px solid #CBD5E1", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: activeSection === "B" ? "#FF8200" : "#64748B", flexShrink: 0, lineHeight: 1, boxSizing: "border-box" }}>
                          {sectionBComplete ? "✓" : "3"}
                        </span>
                        <span>B. Work schedule</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setActiveSection("C"); setExpandedSections(prev => ({ ...prev, C: !prev.C })); }}
                        style={{
                          background: "none",
                          border: "none",
                          borderBottom: activeSection === "C" ? "2px solid #FF8200" : "2px solid transparent",
                          paddingBottom: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          color: activeSection === "C" ? "#FF8200" : sectionCComplete ? "#15803D" : "var(--text-muted)",
                          cursor: "pointer"
                        }}
                      >
                        <span style={{ width: 16, height: 16, minWidth: 16, minHeight: 16, borderRadius: "50%", border: activeSection === "C" ? "2px solid #FF8200" : "2px solid #CBD5E1", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: activeSection === "C" ? "#FF8200" : "#64748B", flexShrink: 0, lineHeight: 1, boxSizing: "border-box" }}>
                          {sectionCComplete ? "✓" : "4"}
                        </span>
                        <span>C. Risk &amp; equipment</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setActiveSection("D"); setExpandedSections(prev => ({ ...prev, D: !prev.D })); }}
                        style={{
                          background: "none",
                          border: "none",
                          borderBottom: activeSection === "D" ? "2px solid #FF8200" : "2px solid transparent",
                          paddingBottom: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          color: activeSection === "D" ? "#FF8200" : sectionDComplete ? "#15803D" : "var(--text-muted)",
                          cursor: "pointer"
                        }}
                      >
                        <span style={{ width: 16, height: 16, minWidth: 16, minHeight: 16, borderRadius: "50%", border: activeSection === "D" ? "2px solid #FF8200" : "2px solid #CBD5E1", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: activeSection === "D" ? "#FF8200" : "#64748B", flexShrink: 0, lineHeight: 1, boxSizing: "border-box" }}>
                          {sectionDComplete ? "✓" : "5"}
                        </span>
                        <span>D. Site address</span>
                      </button>
                    </div>

                    {/* Right: Progress Indicator */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>
                        Step 1 &bull; {completedSectionsCount} of 5 sections complete
                      </span>
                      <div style={{ display: "flex", gap: "3px" }}>
                        {[0, 1, 2, 3, 4].map((segIdx) => (
                          <span
                            key={segIdx}
                            style={{
                              width: "18px",
                              height: "4px",
                              borderRadius: "2px",
                              background: segIdx < completedSectionsCount ? "#FF8200" : "#E2E8F0"
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Group A Card: Organization & PIC Details */}
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden", background: "#FFFFFF" }}>
                    <div
                      onClick={() => { setActiveSection("A"); setExpandedSections(prev => ({ ...prev, A: !prev.A })); }}
                      style={{
                        padding: "12px 16px",
                        background: "#F8FAFC",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border-color)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "20px", height: "20px", minWidth: "20px", minHeight: "20px", borderRadius: "50%", background: "#16A34A", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, flexShrink: 0, lineHeight: 1 }}>✓</span>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: "#EA580C", textTransform: "uppercase" }}>A. Applicant &amp; Organization Particulars</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ background: "#DCFCE7", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>Completed</span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{expandedSections.A ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                        <div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Applicant Organization</div>
                          <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>{newForm.companyName}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Applicant Submitter</div>
                          <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                            {newForm.applicantName} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>({newForm.applicantEmail})</span>
                          </div>
                        </div>
                      </div>

                      {/* PIC Mandatory Details (SUB-07) */}
                      <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #F1F5F9", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                        <div>
                          <label htmlFor="picName" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                            Person-in-Charge (PIC) Name *
                          </label>
                          <input
                            id="picName"
                            type="text"
                            required
                            aria-required="true"
                            aria-invalid={!!errors.picName}
                            placeholder="e.g. Tan Ah Beng"
                            value={newForm.picName}
                            onChange={(e) => setNewForm({ ...newForm, picName: e.target.value })}
                            className="form-control"
                            style={{ width: "100%", marginTop: "4px", border: errors.picName ? "1.5px solid #EF4444" : undefined }}
                          />
                          {errors.picName && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "2px" }}>⚠️ {errors.picName}</span>}
                        </div>

                        <div>
                          <label htmlFor="picMobile" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                            PIC Mobile Phone *
                          </label>
                          <input
                            id="picMobile"
                            type="tel"
                            required
                            aria-required="true"
                            aria-invalid={!!errors.picMobile}
                            placeholder="+65 9123 4567"
                            value={newForm.picMobile}
                            onChange={(e) => setNewForm({ ...newForm, picMobile: e.target.value })}
                            className="form-control"
                            style={{ width: "100%", marginTop: "4px", border: errors.picMobile ? "1.5px solid #EF4444" : undefined }}
                          />
                          {errors.picMobile && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "2px" }}>⚠️ {errors.picMobile}</span>}
                        </div>

                        <div>
                          <label htmlFor="picOfficeNumber" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                            PIC Office Desk Number
                          </label>
                          <input
                            id="picOfficeNumber"
                            type="tel"
                            placeholder="+65 6789 0123"
                            value={newForm.picOfficeNumber}
                            onChange={(e) => setNewForm({ ...newForm, picOfficeNumber: e.target.value })}
                            className="form-control"
                            style={{ width: "100%", marginTop: "4px" }}
                          />
                        </div>
                      </div>

                      {/* SDC Liaison Officer Query (SUB-06) */}
                      <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #F1F5F9" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "12px", alignItems: "flex-start" }}>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                              SDC Liaison Officer (Active LOs) *
                            </label>
                            <select
                              required
                              aria-required="true"
                              aria-invalid={!!errors.sdcLiaisonOfficer}
                              value={newForm.sdcLiaisonOfficer}
                              onChange={(e) => {
                                const val = e.target.value;
                                const matched = activeLoUsers.find((u) => `${u.name} (${u.title || "Liaison Officer"})` === val || u.name === val);
                                setNewForm({
                                  ...newForm,
                                  sdcLiaisonOfficer: val,
                                  loEmail: matched?.email || "",
                                  loMobile: matched?.phone || ""
                                });
                              }}
                              className="form-control select-dark"
                              style={{ width: "100%", marginTop: "4px", border: errors.sdcLiaisonOfficer ? "1.5px solid #EF4444" : undefined }}
                            >
                              <option value="">-- Select Active SDC Liaison Officer --</option>
                              {activeLoUsers.map((lo) => (
                                <option key={lo.id} value={`${lo.name} (${lo.title || "Liaison Officer"})`}>
                                  {lo.name} — {lo.title || "Liaison Officer"} ({lo.department})
                                </option>
                              ))}
                            </select>
                            {activeLoUsers.length === 0 && (
                              <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "2px" }}>
                                Không tìm thấy Liaison Officer đang active.
                              </span>
                            )}
                            {errors.sdcLiaisonOfficer && (
                              <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "2px" }}>
                                ⚠️ {errors.sdcLiaisonOfficer}
                              </span>
                            )}
                          </div>

                          <div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                              Sponsor Email (Read-only)
                            </div>
                            <div style={{ fontSize: "12px", color: newForm.loEmail ? "#0F172A" : "var(--text-muted)", marginTop: "8px", fontWeight: 600 }}>
                              {newForm.loEmail || "— Auto-filled upon LO selection —"}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                              LO Mobile (Read-only)
                            </div>
                            <div style={{ fontSize: "12px", color: newForm.loMobile ? "#0F172A" : "var(--text-muted)", marginTop: "8px", fontWeight: 600 }}>
                              {newForm.loMobile || "— Auto-filled upon LO selection —"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Group A2 Card: Emergency Contact Details (FRD §4) */}
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden", background: "#FFFFFF" }}>
                    <div
                      onClick={() => { setActiveSection("A2"); setExpandedSections(prev => ({ ...prev, A2: !prev.A2 })); }}
                      style={{
                        padding: "12px 16px",
                        background: "#F8FAFC",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        borderBottom: (expandedSections.A2 || !sectionA2Complete) ? "1px solid var(--border-color)" : "none"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          width: "20px",
                          height: "20px",
                          minWidth: "20px",
                          minHeight: "20px",
                          borderRadius: "50%",
                          background: sectionA2Complete ? "#16A34A" : activeSection === "A2" ? "#FF8200" : "#E2E8F0",
                          color: sectionA2Complete || activeSection === "A2" ? "#FFFFFF" : "#64748B",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: sectionA2Complete ? "12px" : "11px",
                          fontWeight: 800,
                          flexShrink: 0,
                          lineHeight: 1
                        }}>
                          {sectionA2Complete ? "✓" : "2"}
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: activeSection === "A2" ? "#EA580C" : "var(--text-main)", textTransform: "uppercase" }}>
                          A2. Emergency Contact Details
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          background: sectionA2Complete ? "#DCFCE7" : "#FEF3C7",
                          color: sectionA2Complete ? "#166534" : "#92400E",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700
                        }}>
                          {sectionA2Complete ? "Completed" : "In Progress"}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{expandedSections.A2 ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {!expandedSections.A2 && sectionA2Complete ? (
                      <div style={{ padding: "12px 16px", fontSize: "12px", color: "var(--text-main)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>Primary Contact: </span>
                          <strong>{newForm.emergencyContactName1}</strong> ({newForm.emergencyContactMobile1})
                          {newForm.emergencyContactName2 && (
                            <span style={{ marginLeft: "14px" }}>
                              <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>Secondary: </span>
                              <strong>{newForm.emergencyContactName2}</strong> ({newForm.emergencyContactMobile2})
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedSections(prev => ({ ...prev, A2: true }))}
                          style={{ color: "#FF8200", background: "none", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                          <div>
                            <label htmlFor="emergencyContactName1" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Emergency Contact Name #1 *</label>
                            <input
                              id="emergencyContactName1"
                              type="text"
                              required
                              aria-required="true"
                              aria-invalid={!!errors.emergencyContactName1}
                              value={newForm.emergencyContactName1}
                              onChange={(e) => setNewForm({ ...newForm, emergencyContactName1: e.target.value })}
                              className="form-control"
                              style={{ width: "100%", marginTop: "4px", border: errors.emergencyContactName1 ? "1.5px solid #EF4444" : undefined }}
                            />
                            {errors.emergencyContactName1 && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "2px" }}>⚠️ {errors.emergencyContactName1}</span>}
                          </div>
                          <div>
                            <label htmlFor="emergencyContactMobile1" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Emergency Contact Mobile #1 *</label>
                            <input
                              id="emergencyContactMobile1"
                              type="tel"
                              required
                              aria-required="true"
                              aria-invalid={!!errors.emergencyContactMobile1}
                              placeholder="+65 9123 4567"
                              value={newForm.emergencyContactMobile1}
                              onChange={(e) => setNewForm({ ...newForm, emergencyContactMobile1: e.target.value })}
                              className="form-control"
                              style={{ width: "100%", marginTop: "4px", border: errors.emergencyContactMobile1 ? "1.5px solid #EF4444" : undefined }}
                            />
                            {errors.emergencyContactMobile1 && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "2px" }}>⚠️ {errors.emergencyContactMobile1}</span>}
                          </div>
                          <div>
                            <label htmlFor="emergencyContactName2" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Emergency Contact Name #2</label>
                            <input
                              id="emergencyContactName2"
                              type="text"
                              value={newForm.emergencyContactName2}
                              onChange={(e) => setNewForm({ ...newForm, emergencyContactName2: e.target.value })}
                              className="form-control"
                              style={{ width: "100%", marginTop: "4px" }}
                            />
                          </div>
                          <div>
                            <label htmlFor="emergencyContactMobile2" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Emergency Contact Mobile #2</label>
                            <input
                              id="emergencyContactMobile2"
                              type="tel"
                              aria-invalid={!!errors.emergencyContactMobile2}
                              placeholder="+65 9123 4567"
                              value={newForm.emergencyContactMobile2}
                              onChange={(e) => setNewForm({ ...newForm, emergencyContactMobile2: e.target.value })}
                              className="form-control"
                              style={{ width: "100%", marginTop: "4px", border: errors.emergencyContactMobile2 ? "1.5px solid #EF4444" : undefined }}
                            />
                            {errors.emergencyContactMobile2 && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "2px" }}>⚠️ {errors.emergencyContactMobile2}</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Group B Card: Scope & Schedule */}
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden", background: "#FFFFFF" }}>
                    <div
                      onClick={() => { setActiveSection("B"); setExpandedSections(prev => ({ ...prev, B: !prev.B })); }}
                      style={{
                        padding: "12px 16px",
                        background: "#F8FAFC",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        borderBottom: (expandedSections.B || !sectionBComplete) ? "1px solid var(--border-color)" : "none"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          width: "20px",
                          height: "20px",
                          minWidth: "20px",
                          minHeight: "20px",
                          borderRadius: "50%",
                          background: sectionBComplete ? "#16A34A" : activeSection === "B" ? "#FF8200" : "#E2E8F0",
                          color: sectionBComplete || activeSection === "B" ? "#FFFFFF" : "#64748B",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: sectionBComplete ? "12px" : "11px",
                          fontWeight: 800,
                          flexShrink: 0,
                          lineHeight: 1
                        }}>
                          {sectionBComplete ? "✓" : "3"}
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: activeSection === "B" ? "#EA580C" : "var(--text-main)", textTransform: "uppercase" }}>
                          B. Work Schedule &amp; Operational Classification
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          background: sectionBComplete ? "#DCFCE7" : "#FEF3C7",
                          color: sectionBComplete ? "#166534" : "#92400E",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700
                        }}>
                          {sectionBComplete ? "Completed" : "In Progress"}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{expandedSections.B ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {!expandedSections.B && sectionBComplete ? (
                      <div style={{ padding: "12px 16px", fontSize: "12px", color: "var(--text-main)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong>{newForm.projectTitle}</strong> &bull; <span style={{ color: "#FF8200", fontWeight: 700 }}>{newForm.durationCategory}</span>
                          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "3px" }}>
                            📅 {newForm.startDate} to {newForm.endDate} ({newForm.dailyStartTime} – {newForm.dailyEndTime})
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedSections(prev => ({ ...prev, B: true }))}
                          style={{ color: "#FF8200", background: "none", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Scope of Work Description *</label>
                          <textarea
                            rows={2}
                            required
                            aria-required="true"
                            aria-invalid={!!errors.workDescription}
                            placeholder="Detailed description of works, methodology, plant and equipment..."
                            value={newForm.workDescription}
                            onChange={(e) => setNewForm({ ...newForm, workDescription: e.target.value })}
                            className="form-control"
                            style={{ width: "100%", marginTop: "4px", border: errors.workDescription ? "1.5px solid #EF4444" : undefined }}
                          />
                          {errors.workDescription && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "2px" }}>⚠️ {errors.workDescription}</span>}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>NOP Category *</label>
                            <select
                              value={newForm.durationCategory}
                              onChange={(e) => setNewForm({ ...newForm, durationCategory: e.target.value as any })}
                              className="form-control select-dark"
                              style={{ width: "100%", marginTop: "4px" }}
                            >
                              <option value="BAU Maintenance">BAU Maintenance</option>
                              <option value="Ad-hoc Work">Ad-hoc Work</option>
                              <option value="Project Work">Project Work</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Daily Start Time *</label>
                            <input
                              type="time"
                              required
                              aria-required="true"
                              value={newForm.dailyStartTime}
                              onChange={(e) => setNewForm({ ...newForm, dailyStartTime: e.target.value })}
                              className="form-control"
                              style={{ width: "100%", marginTop: "4px" }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Daily End Time *</label>
                            <input
                              type="time"
                              required
                              aria-required="true"
                              value={newForm.dailyEndTime}
                              onChange={(e) => setNewForm({ ...newForm, dailyEndTime: e.target.value })}
                              className="form-control"
                              style={{ width: "100%", marginTop: "4px" }}
                            />
                          </div>
                        </div>

                        {/* Project Title — FRD: mandatory for every NOP application */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "#F8FAFC", padding: "10px 12px", borderRadius: "6px" }}>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Project Title *</label>
                            <input
                              type="text"
                              required
                              aria-required="true"
                              aria-invalid={!!errors.projectTitle}
                              placeholder="e.g. Sentosa Ridge Connector Phase 2"
                              value={newForm.projectTitle}
                              onChange={(e) => setNewForm({ ...newForm, projectTitle: e.target.value })}
                              className="form-control"
                              style={{ width: "100%", marginTop: "4px", border: errors.projectTitle ? "1.5px solid #EF4444" : undefined }}
                            />
                            {errors.projectTitle && <span style={{ color: "#B91C1C", fontSize: "11px" }}>⚠️ {errors.projectTitle}</span>}
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Work Start Date *</label>
                            <input
                              type="date"
                              required
                              aria-required="true"
                              aria-invalid={!!errors.startDate}
                              value={newForm.startDate}
                              onChange={(e) => setNewForm({ ...newForm, startDate: e.target.value })}
                              className="form-control"
                              style={{ width: "100%", marginTop: "4px", border: errors.startDate ? "1.5px solid #EF4444" : undefined }}
                            />
                            {errors.startDate && <span style={{ color: "#B91C1C", fontSize: "11px" }}>⚠️ {errors.startDate}</span>}
                          </div>

                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Work End Date *</label>
                            <input
                              type="date"
                              required
                              aria-required="true"
                              aria-invalid={!!errors.endDate}
                              min={newForm.startDate}
                              value={newForm.endDate}
                              onChange={(e) => setNewForm({ ...newForm, endDate: e.target.value })}
                              className="form-control"
                              style={{ width: "100%", marginTop: "4px", border: errors.endDate ? "1.5px solid #EF4444" : undefined }}
                            />
                            {errors.endDate && <span style={{ color: "#B91C1C", fontSize: "11px" }}>⚠️ {errors.endDate}</span>}
                          </div>
                        </div>

                        {/* Island Blackout Advisory Warning (I07) */}
                        {blackoutCheck.isBlackout && (
                          <div style={{ marginTop: "12px", padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                            <span style={{ fontSize: "16px", flexShrink: 0 }}>⚠️</span>
                            <div style={{ fontSize: "12px", color: "#991B1B", lineHeight: 1.45 }}>
                              <strong>Island Blackout Date Advisory:</strong> Selected schedule overlaps with {blackoutCheck.reason || "an island blackout moratorium date, weekend, or Singapore public holiday"}.
                              Please provide operational justification in Section C (High Risk Activities &amp; Blackout Justification) if works must proceed.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Work Involvements / Triggers */}
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Statutory Work Involvements / Triggers * ({selectedTriggers.length} selected)
                    </label>
                    {errors.triggers && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block" }}>⚠️ {errors.triggers}</span>}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "8px", marginTop: "4px" }}>
                      {STATUTORY_TRIGGERS_LIST.map((t, idx) => {
                        const checked = selectedTriggers.includes(t);
                        return (
                          <label key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "11.5px", cursor: "pointer", background: checked ? "rgba(194, 65, 12, 0.08)" : "transparent", padding: "4px 6px", borderRadius: "4px" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedTriggers([...selectedTriggers, t]);
                                else setSelectedTriggers(selectedTriggers.filter((x) => x !== t));
                              }}
                            />
                            <span>{t}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Conditional Excavation Depth in Step 2 (I08) */}
                  {selectedTriggers.includes("Excavation Work") && (
                    <div style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", padding: "10px 14px", borderRadius: "8px" }}>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-main)", textTransform: "uppercase" }}>
                        Excavation Depth in Metres *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        aria-required="true"
                        aria-invalid={!!errors.excavationDepth}
                        placeholder="e.g. 2.5"
                        value={newForm.excavationDepth}
                        onChange={(e) => setNewForm({ ...newForm, excavationDepth: e.target.value })}
                        className="form-control"
                        style={{ width: "100%", marginTop: "4px", border: errors.excavationDepth ? "1.5px solid #EF4444" : undefined }}
                      />
                      {errors.excavationDepth && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "2px" }}>⚠️ {errors.excavationDepth}</span>}
                    </div>
                  )}

                  {/* Conditional Scaffolding Structure in Step 2 (I08) */}
                  {selectedTriggers.includes("Working at Height Above 30 Metres") && (
                    <div style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", padding: "10px 14px", borderRadius: "8px" }}>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-main)", textTransform: "uppercase" }}>
                        Scaffolding Structure Involved for Works at Height Above 30m *
                      </label>
                      <select
                        required
                        aria-required="true"
                        aria-invalid={!!errors.scaffoldingInvolved}
                        value={newForm.scaffoldingInvolved}
                        onChange={(e) => setNewForm({ ...newForm, scaffoldingInvolved: e.target.value })}
                        className="form-control select-dark"
                        style={{ width: "100%", marginTop: "4px", border: errors.scaffoldingInvolved ? "1.5px solid #EF4444" : undefined }}
                      >
                        <option value="">-- Please Select (Required) --</option>
                        <option value="No">No — Using MEWP / BMU / Suspended Cradle</option>
                        <option value="Yes">Yes — Scaffold Erection / Modification (PE Calculation Required)</option>
                      </select>
                      {errors.scaffoldingInvolved && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "2px" }}>⚠️ {errors.scaffoldingInvolved}</span>}
                    </div>
                  )}



{/* SUB-03: Urgent NOP Notice with deferrable documents schedule */}
                  {isUrgent && (
                    <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: "8px", padding: "14px 18px", color: "#92400E" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "13px", color: "#B45309", marginBottom: "6px" }}>
                        <IconAlertTriangle size={18} color="#D97706" />
                        <span>Hồ sơ được phân loại NOP Khẩn cấp (Urgent Application — Start Date within 7 days)</span>
                      </div>
                      <div style={{ fontSize: "12px", lineHeight: 1.5, color: "#78350F" }}>
                        Vì ngày bắt đầu công việc dự kiến (<strong>{newForm.startDate}</strong>) trong vòng <strong>7 ngày</strong> kể từ ngày nộp, hồ sơ được phân loại là <strong>Urgent (Khẩn cấp)</strong>.
                        Theo quy trình SDC, hồ sơ có thể được cấp <strong>In-Principle Approval (IPA)</strong> trước khi hoàn tất đầy đủ tài liệu.
                      </div>
                      <div style={{ marginTop: "10px", padding: "10px 14px", background: "#FEF3C7", borderRadius: "6px", fontSize: "11.5px" }}>
                        <strong style={{ color: "#92400E" }}>Danh sách tài liệu được phép nộp sau (Deferrable Supporting Documents):</strong>
                        <ul style={{ margin: "6px 0 0 18px", padding: 0, color: "#92400E", lineHeight: 1.6 }}>
                          {applicableConditionalDocs
                            .filter((d) => isDeferrableWhenUrgent(d.id))
                            .map((doc) => (
                              <li key={doc.id}>
                                <strong>{doc.name}</strong> — Được phép hoãn nộp tại bước này và nộp bổ sung sau khi cấp IPA.
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Statutory Baseline Documents (PDF, PNG, JPG, BMP, GIF up to 4MB) *
                    </label>
                    {errors.documents && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "2px" }}>⚠️ {errors.documents}</span>}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
                      {SUPPORTING_DOCUMENT_SCHEDULE.filter((d) => d.category === "Baseline").map((doc) => {
                        const attached = uploadedFiles.find((f) => f.slotId === doc.id);
                        return (
                          <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border-color)", padding: "8px 12px", borderRadius: "6px", fontSize: "12px" }}>
                            <div>
                              <strong>{doc.name}</strong>
                              <span style={{ marginLeft: "6px", fontSize: "10px", fontWeight: 800, color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA", padding: "1px 6px", borderRadius: "4px" }}>
                                REQUIRED
                              </span>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{doc.description}</div>
                              {attached && <div style={{ fontSize: "11px", color: "#15803D" }}>✓ Attached: {attached.name} ({attached.size})</div>}
                            </div>
                            <label style={{ background: "#0F172A", color: "#FFF", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                              Browse
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.bmp,.gif"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    const f = e.target.files[0];
                                    const newUp = uploadedFiles.filter((u) => u.slotId !== doc.id);
                                    newUp.push({
                                      id: `upl-${Date.now()}`,
                                      slotId: doc.id,
                                      name: f.name,
                                      size: (f.size / 1024 / 1024).toFixed(1) + " MB",
                                      type: f.name.split(".").pop()?.toUpperCase() || "PDF"
                                    });
                                    setUploadedFiles(newUp);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {applicableConditionalDocs.length > 0 && (
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Conditional Documents — Triggered by Selected Work Involvements *
                      </label>
                      {errors.conditionalDocuments && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "2px" }}>⚠️ {errors.conditionalDocuments}</span>}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
                        {applicableConditionalDocs.map((doc) => {
                          const attached = uploadedFiles.find((f) => f.slotId === doc.id);
                          const isDeferrable = isUrgent && isDeferrableWhenUrgent(doc.id);
                          return (
                            <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border-color)", padding: "8px 12px", borderRadius: "6px", fontSize: "12px" }}>
                              <div>
                                <strong>{doc.name}</strong>
                                {isDeferrable ? (
                                  <span style={{ marginLeft: "6px", fontSize: "10px", fontWeight: 800, color: "#B45309", background: "#FFFBEB", border: "1px solid #FDE68A", padding: "1px 6px", borderRadius: "4px" }}>
                                    DEFERRABLE FOR URGENT NOP
                                  </span>
                                ) : (
                                  <span style={{ marginLeft: "6px", fontSize: "10px", fontWeight: 800, color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA", padding: "1px 6px", borderRadius: "4px" }}>
                                    REQUIRED
                                  </span>
                                )}
                                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{doc.description}</div>
                                {attached && <div style={{ fontSize: "11px", color: "#15803D" }}>✓ Attached: {attached.name} ({attached.size})</div>}
                              </div>
                              <label style={{ background: "#0F172A", color: "#FFF", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                                Browse
                                <input
                                  type="file"
                                  accept=".pdf,.png,.jpg,.jpeg,.bmp,.gif"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      const f = e.target.files[0];
                                      const newUp = uploadedFiles.filter((u) => u.slotId !== doc.id);
                                      newUp.push({
                                        id: `upl-${Date.now()}`,
                                        slotId: doc.id,
                                        name: f.name,
                                        size: (f.size / 1024 / 1024).toFixed(1) + " MB",
                                        type: f.name.split(".").pop()?.toUpperCase() || "PDF"
                                      });
                                      setUploadedFiles(newUp);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Optional Supporting Documents — FRD Supporting Document Schedule "Optionals":
                      Other Relevant Authority Approval or Permit, Work Schedule, Others. Per FRD:
                      "Upload fields for Optional supporting documents, including Others, shall
                      remain available for applicants to provide applicable additional information."
                      Not required — validateStep3 does not check these. */}
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Optional Supporting Documents
                    </label>
                    <p style={{ fontSize: "11px", color: "var(--text-faint)", margin: "2px 0 6px" }}>
                      Not required to submit — provide any additional documents that support your application.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {SUPPORTING_DOCUMENT_SCHEDULE.filter((d) => d.category === "Optional").map((doc) => {
                        const attached = uploadedFiles.find((f) => f.slotId === doc.id);
                        return (
                          <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border-color)", padding: "8px 12px", borderRadius: "6px", fontSize: "12px" }}>
                            <div>
                              <strong>{doc.name}</strong>
                              <span style={{ marginLeft: "6px", fontSize: "10px", fontWeight: 800, color: "#0369A1", background: "#F0F9FF", border: "1px solid #BAE6FD", padding: "1px 6px", borderRadius: "4px" }}>
                                OPTIONAL
                              </span>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{doc.description}</div>
                              {attached && <div style={{ fontSize: "11px", color: "#15803D" }}>✓ Attached: {attached.name} ({attached.size})</div>}
                            </div>
                            <label style={{ background: "#0F172A", color: "#FFF", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                              Browse
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.bmp,.gif"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    const f = e.target.files[0];
                                    const newUp = uploadedFiles.filter((u) => u.slotId !== doc.id);
                                    newUp.push({
                                      id: `upl-${Date.now()}`,
                                      slotId: doc.id,
                                      name: f.name,
                                      size: (f.size / 1024 / 1024).toFixed(1) + " MB",
                                      type: f.name.split(".").pop()?.toUpperCase() || "PDF"
                                    });
                                    setUploadedFiles(newUp);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Workers Muster */}
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      On-Site Workers Muster ({workersList.length} registered) *
                    </label>
                    {errors.workers && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block" }}>⚠️ {errors.workers}</span>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px", marginBottom: "6px" }}>
                      <label className="sr-only" htmlFor="newWorkerName">Worker Name</label>
                      <input id="newWorkerName" type="text" placeholder="Worker Name" value={newWorker.name} onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })} className="form-control" style={{ flex: 2, minWidth: "120px" }} />
                      <label className="sr-only" htmlFor="newWorkerTrade">Trade / Occupation</label>
                      <input id="newWorkerTrade" type="text" placeholder="Trade / Occupation (e.g. Scaffolder)" value={newWorker.tradeOccupation || ""} onChange={(e) => setNewWorker({ ...newWorker, tradeOccupation: e.target.value })} className="form-control" style={{ flex: 1.5, minWidth: "120px" }} />
                      <label className="sr-only" htmlFor="newWorkerEmployerCompany">Employer Company</label>
                      <input id="newWorkerEmployerCompany" type="text" placeholder="Employer Company" value={newWorker.employerCompany} onChange={(e) => setNewWorker({ ...newWorker, employerCompany: e.target.value })} className="form-control" style={{ flex: 2, minWidth: "140px" }} />
                      <label className="sr-only" htmlFor="newWorkerPermitNumber">Work Permit Number</label>
                      <input id="newWorkerPermitNumber" type="text" placeholder="Work Permit Number" value={newWorker.workPermitNumber} onChange={(e) => setNewWorker({ ...newWorker, workPermitNumber: e.target.value })} className="form-control" style={{ flex: 1.5, minWidth: "120px" }} />
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddWorker} style={{ fontWeight: 700 }}>+ Add Worker</button>
                    </div>
                    {workersList.length > 0 ? (
                      <div style={{ maxHeight: "200px", overflowY: "auto", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "6px", marginTop: "8px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
                          <thead>
                            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--text-muted)" }}>Worker Name</th>
                              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--text-muted)" }}>Trade / Occupation</th>
                              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--text-muted)" }}>Employer Company</th>
                              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--text-muted)" }}>Work Permit No.</th>
                              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--text-muted)", textAlign: "right" }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {workersList.map((w) => (
                              <tr key={w.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                                <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--text-main)" }}>{w.name}</td>
                                <td style={{ padding: "8px 10px", color: "#2563EB", fontWeight: 600 }}>{w.tradeOccupation || "General Labourer"}</td>
                                <td style={{ padding: "8px 10px", color: "var(--text-main)" }}>{w.employerCompany || "—"}</td>
                                <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>{w.workPermitNumber || "—"}</td>
                                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveWorker(w.id)}
                                    style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: "12px", background: "#F8FAFC", border: "1px dashed var(--border-color)", borderRadius: "6px", textAlign: "center", color: "var(--text-muted)", fontSize: "11.5px", marginTop: "8px" }}>
                        No personnel registered yet. Add at least one authorized worker using the form fields above.
                      </div>
                    )}
                  </div>

{/* Group C Card: Blackout Dates, Night Works & Equipment */}
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden", background: "#FFFFFF" }}>
                    <div
                      onClick={() => { setActiveSection("C"); setExpandedSections(prev => ({ ...prev, C: !prev.C })); }}
                      style={{
                        padding: "12px 16px",
                        background: "#F8FAFC",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        borderBottom: (expandedSections.C || !sectionCComplete) ? "1px solid var(--border-color)" : "none"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          width: "20px",
                          height: "20px",
                          minWidth: "20px",
                          minHeight: "20px",
                          borderRadius: "50%",
                          background: sectionCComplete ? "#16A34A" : activeSection === "C" ? "#FF8200" : "#E2E8F0",
                          color: sectionCComplete || activeSection === "C" ? "#FFFFFF" : "#64748B",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: sectionCComplete ? "12px" : "11px",
                          fontWeight: 800,
                          flexShrink: 0,
                          lineHeight: 1
                        }}>
                          {sectionCComplete ? "✓" : "4"}
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: activeSection === "C" ? "#EA580C" : "var(--text-main)", textTransform: "uppercase" }}>
                          C. Blackout &amp; High-Risk Work Particulars
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          background: sectionCComplete ? "#DCFCE7" : "#FEF3C7",
                          color: sectionCComplete ? "#166534" : "#92400E",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700
                        }}>
                          {sectionCComplete ? "Completed" : "In Progress"}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{expandedSections.C ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {!expandedSections.C && sectionCComplete ? (
                      <div style={{ padding: "12px 16px", fontSize: "12px", color: "var(--text-main)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span><strong>Equipment:</strong> {newForm.equipmentType.length > 0 ? newForm.equipmentType.join(", ") : "None specified"}</span>
                          <span style={{ marginLeft: "12px" }}>&bull; <strong>Vehicle:</strong> {newForm.vehicleType}</span>
                          <span style={{ marginLeft: "12px" }}>&bull; <strong>Night works:</strong> {newForm.nightWorkInvolved ? "Yes" : "No"}</span>
                          <span style={{ marginLeft: "12px" }}>&bull; <strong>Blackout overlap:</strong> {newForm.workingOnBlackoutDates ? "Yes" : "No"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedSections(prev => ({ ...prev, C: true }))}
                          style={{ color: "#FF8200", background: "none", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        {/* Blackout Check */}
                        <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", padding: "12px", borderRadius: "8px" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", fontWeight: 700, color: "#92400E", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={newForm.workingOnBlackoutDates}
                              onChange={(e) => setNewForm({ ...newForm, workingOnBlackoutDates: e.target.checked })}
                            />
                            <span>Permit involves works during scheduled Island Blackout Dates</span>
                          </label>

                          {newForm.workingOnBlackoutDates && (
                            <div style={{ marginTop: "8px" }}>
                              <label style={{ fontSize: "11px", fontWeight: 700, color: "#92400E", textTransform: "uppercase" }}>
                                Blackout Dates Work Reason &amp; Mitigation Plan *
                              </label>
                              <input
                                type="text"
                                required
                                aria-required="true"
                                aria-invalid={!!errors.blackoutWorkReason}
                                placeholder="State operational reason for executing works during blackout window..."
                                value={newForm.blackoutWorkReason}
                                onChange={(e) => setNewForm({ ...newForm, blackoutWorkReason: e.target.value })}
                                className="form-control"
                                style={{ width: "100%", marginTop: "4px", border: errors.blackoutWorkReason ? "1.5px solid #EF4444" : undefined }}
                              />
                              {errors.blackoutWorkReason && <span style={{ color: "#B91C1C", fontSize: "11px" }}>⚠️ {errors.blackoutWorkReason}</span>}
                            </div>
                          )}
                        </div>

                        {/* Night Work Check */}
                        <div style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", padding: "12px", borderRadius: "8px" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", fontWeight: 700, color: "var(--text-main)", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={newForm.nightWorkInvolved}
                              onChange={(e) => setNewForm({ ...newForm, nightWorkInvolved: e.target.checked })}
                            />
                            <span>Night Works Required (Works between 22:00 and 07:00 hrs)</span>
                          </label>

                          {newForm.nightWorkInvolved && (
                            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                              <div>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Night Work Operational Justification *</label>
                                <input
                                  type="text"
                                  required
                                  aria-required="true"
                                  aria-invalid={!!errors.nightWorkReason}
                                  placeholder="Explain why works cannot be executed during standard daytime hours..."
                                  value={newForm.nightWorkReason}
                                  onChange={(e) => setNewForm({ ...newForm, nightWorkReason: e.target.value })}
                                  className="form-control"
                                  style={{ width: "100%", marginTop: "4px", border: errors.nightWorkReason ? "1.5px solid #EF4444" : undefined }}
                                />
                                {errors.nightWorkReason && <span style={{ color: "#B91C1C", fontSize: "11px" }}>⚠️ {errors.nightWorkReason}</span>}
                              </div>

                              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-main)", cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  required
                                  aria-required="true"
                                  checked={newForm.nightWorkAcknowledged}
                                  onChange={(e) => setNewForm({ ...newForm, nightWorkAcknowledged: e.target.checked })}
                                />
                                <span>I acknowledge compliance with SDC Night Noise Mitigation Guidelines and NEA regulations.</span>
                              </label>
                              {errors.nightWorkAcknowledged && <span style={{ color: "#B91C1C", fontSize: "11px" }}>⚠️ {errors.nightWorkAcknowledged}</span>}
                            </div>
                          )}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Confined Space Entry Involved</label>
                            <select
                              value={newForm.confinedSpaceInvolved ? "Yes" : "No"}
                              onChange={(e) => setNewForm({ ...newForm, confinedSpaceInvolved: e.target.value === "Yes" })}
                              className="form-control select-dark"
                              style={{ width: "100%", marginTop: "4px" }}
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes (Confined Space Entry Assessor Required)</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Lifting Operations (Mobile Crane / Lorry Crane)</label>
                            <select
                              value={newForm.liftingOperations ? "Yes" : "No"}
                              onChange={(e) => setNewForm({ ...newForm, liftingOperations: e.target.value === "Yes" })}
                              className="form-control select-dark"
                              style={{ width: "100%", marginTop: "4px" }}
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes (Lifting Plan &amp; Appointed Person Required)</option>
                            </select>
                          </div>

                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                              Equipment Type — Multi-Select ({newForm.equipmentType.length} selected)
                            </label>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "8px", marginTop: "4px" }}>
                              {EQUIPMENT_TYPE_OPTIONS.map((opt) => {
                                const checked = newForm.equipmentType.includes(opt);
                                return (
                                  <label key={opt} style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "11.5px", cursor: "pointer", background: checked ? "rgba(194, 65, 12, 0.08)" : "transparent", padding: "4px 6px", borderRadius: "4px" }}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        if (e.target.checked) setNewForm({ ...newForm, equipmentType: [...newForm.equipmentType, opt] });
                                        else setNewForm({ ...newForm, equipmentType: newForm.equipmentType.filter((x) => x !== opt) });
                                      }}
                                    />
                                    <span>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                            {newForm.equipmentType.includes("Other") && (
                              <div style={{ marginTop: "8px" }}>
                                <label htmlFor="otherEquipment" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                                  Other Equipment Details *
                                </label>
                                <input
                                  id="otherEquipment"
                                  type="text"
                                  required
                                  aria-required="true"
                                  aria-invalid={!!errors.otherEquipment}
                                  placeholder="Describe the other equipment being deployed"
                                  value={newForm.otherEquipment}
                                  onChange={(e) => setNewForm({ ...newForm, otherEquipment: e.target.value })}
                                  className="form-control"
                                  style={{ width: "100%", marginTop: "4px", border: errors.otherEquipment ? "1.5px solid #EF4444" : undefined }}
                                />
                                {errors.otherEquipment && <span style={{ color: "#B91C1C", fontSize: "11px" }}>⚠️ {errors.otherEquipment}</span>}
                              </div>
                            )}
                          </div>

                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                              Scaffolding Structure Involved *
                            </label>
                            <select
                              required
                              aria-required="true"
                              aria-invalid={!!errors.scaffoldingInvolved}
                              value={newForm.scaffoldingInvolved}
                              onChange={(e) => setNewForm({ ...newForm, scaffoldingInvolved: e.target.value })}
                              className="form-control select-dark"
                              style={{ width: "100%", marginTop: "4px", border: errors.scaffoldingInvolved ? "1.5px solid #EF4444" : undefined }}
                            >
                              <option value="">-- Please Select (Required) --</option>
                              <option value="No">No — Using MEWP / BMU / Suspended Cradle / Ground Level</option>
                              <option value="Yes">Yes — Scaffold Erection / Modification (PE Calculation Required)</option>
                            </select>
                            {errors.scaffoldingInvolved && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "2px" }}>⚠️ {errors.scaffoldingInvolved}</span>}
                          </div>

                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Site Vehicle Type *</label>
                            <select
                              required
                              aria-required="true"
                              aria-invalid={!!errors.vehicleType}
                              value={newForm.vehicleType}
                              onChange={(e) => setNewForm({ ...newForm, vehicleType: e.target.value })}
                              className="form-control select-dark"
                              style={{ width: "100%", marginTop: "4px", border: errors.vehicleType ? "1.5px solid #EF4444" : undefined }}
                            >
                              <option value="">-- Please Select (Required) --</option>
                              <option value="None">None</option>
                              <option value="Tipper Truck (3-Axle)">Tipper Truck (3-Axle)</option>
                              <option value="Ready-Mix Concrete Truck">Ready-Mix Concrete Truck</option>
                              <option value="Low-Bed Trailer">Low-Bed Trailer</option>
                            </select>
                            {errors.vehicleType && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "2px" }}>⚠️ {errors.vehicleType}</span>}
                          </div>

                          {/* Conditional Excavation Depth */}
                          {selectedTriggers.includes("Excavation Work") && (
                            <div style={{ gridColumn: "1 / -1", background: "#F1F5F9", border: "1px solid #CBD5E1", padding: "10px 12px", borderRadius: "6px" }}>
                              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-main)", textTransform: "uppercase" }}>
                                Excavation Depth in Metres *
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                required
                                aria-required="true"
                                aria-invalid={!!errors.excavationDepth}
                                placeholder="e.g. 2.5"
                                value={newForm.excavationDepth}
                                onChange={(e) => setNewForm({ ...newForm, excavationDepth: e.target.value })}
                                className="form-control"
                                style={{ width: "100%", marginTop: "4px", border: errors.excavationDepth ? "1.5px solid #EF4444" : undefined }}
                              />
                              {errors.excavationDepth && <span style={{ color: "#B91C1C", fontSize: "11px" }}>⚠️ {errors.excavationDepth}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Group D Card: Detailed Location Address */}
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden", background: "#FFFFFF" }}>
                    <div
                      onClick={() => { setActiveSection("D"); setExpandedSections(prev => ({ ...prev, D: !prev.D })); }}
                      style={{
                        padding: "12px 16px",
                        background: "#F8FAFC",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        borderBottom: (expandedSections.D || !sectionDComplete) ? "1px solid var(--border-color)" : "none"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          width: "20px",
                          height: "20px",
                          minWidth: "20px",
                          minHeight: "20px",
                          borderRadius: "50%",
                          background: sectionDComplete ? "#16A34A" : activeSection === "D" ? "#FF8200" : "#E2E8F0",
                          color: sectionDComplete || activeSection === "D" ? "#FFFFFF" : "#64748B",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: sectionDComplete ? "12px" : "11px",
                          fontWeight: 800,
                          flexShrink: 0,
                          lineHeight: 1
                        }}>
                          {sectionDComplete ? "✓" : "5"}
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: activeSection === "D" ? "#EA580C" : "var(--text-main)", textTransform: "uppercase" }}>
                          D. Detailed Site Address &amp; Spatial Reference
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          background: sectionDComplete ? "#DCFCE7" : "#FEF3C7",
                          color: sectionDComplete ? "#166534" : "#92400E",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700
                        }}>
                          {sectionDComplete ? "Completed" : "In Progress"}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{expandedSections.D ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {!expandedSections.D && sectionDComplete ? (
                      <div style={{ padding: "12px 16px", fontSize: "12px", color: "var(--text-main)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong>{newForm.buildingCommonName}</strong> &bull; {newForm.roadName}, S({newForm.postalCode})
                          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                            Level: {newForm.level} &bull; Space: {newForm.spaceDescription} {newForm.unitRoomNumber ? `(${newForm.unitRoomNumber})` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedSections(prev => ({ ...prev, D: true }))}
                          style={{ color: "#FF8200", background: "none", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ marginBottom: "12px" }}>
                          <LocationSelector
                            onLocationSelect={(details) => {
                              setNewForm({
                                ...newForm,
                                roadName: details.road,
                                buildingCommonName: details.building,
                                level: details.levelSpace,
                                postalCode: details.postalCode,
                                spaceDescription: details.commonName,
                                unitRoomNumber: "",
                              });
                            }}
                            initialRoad={newForm.roadName}
                            initialBuilding={newForm.buildingCommonName}
                            initialLevelSpace={newForm.level}
                            initialCommonName={newForm.spaceDescription}
                            initialPostalCode={newForm.postalCode}
                          />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                          <div className="form-group">
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Common Name Reference</label>
                            <input type="text" placeholder="e.g. Siloso Lifeguard Post 2" value={newForm.spaceDescription} onChange={(e) => setNewForm({ ...newForm, spaceDescription: e.target.value })} className="form-control" style={{ width: "100%", marginTop: "4px" }} />
                          </div>
                          <div className="form-group">
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Unit / Room Number</label>
                            <input type="text" placeholder="PB-K03" value={newForm.unitRoomNumber} onChange={(e) => setNewForm({ ...newForm, unitRoomNumber: e.target.value })} className="form-control" style={{ width: "100%", marginTop: "4px" }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                                {/* SUB-21: Interactive Location Tags */}
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Location Tags (Editable)
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", marginTop: "4px", minHeight: "34px", padding: "6px 10px", background: "#F8FAFC", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
                      {newForm.locationTags && newForm.locationTags.length > 0 ? (
                        newForm.locationTags.map((t, idx) => (
                          <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "2px 8px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "12px", fontSize: "11px", color: "#1D4ED8", fontWeight: 600 }}>
                            #{t}
                            <button
                              type="button"
                              onClick={() => setNewForm({ ...newForm, locationTags: newForm.locationTags.filter((_, i) => i !== idx) })}
                              style={{ background: "none", border: "none", color: "#1D4ED8", cursor: "pointer", fontSize: "12px", padding: 0, lineHeight: 1 }}
                              aria-label={`Remove tag ${t}`}
                            >
                              &times;
                            </button>
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                          No tags assigned. Selecting a location preset will auto-generate tags, or add custom tags below.
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                      <input
                        type="text"
                        placeholder="Add custom tag (e.g. Waterfront, Beachfront, Boardwalk)..."
                        value={newCustomTag}
                        onChange={(e) => setNewCustomTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const clean = newCustomTag.trim();
                            if (clean && !newForm.locationTags.includes(clean)) {
                              setNewForm({ ...newForm, locationTags: [...newForm.locationTags, clean] });
                              setNewCustomTag("");
                            }
                          }
                        }}
                        className="form-control"
                        style={{ flex: 1, fontSize: "12px" }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const clean = newCustomTag.trim();
                          if (clean && !newForm.locationTags.includes(clean)) {
                            setNewForm({ ...newForm, locationTags: [...newForm.locationTags, clean] });
                            setNewCustomTag("");
                          }
                        }}
                        style={{ fontSize: "11px", fontWeight: 700 }}
                      >
                        + Add Tag
                      </button>
                    </div>
                  </div>

                  {/* Interactive Map Drawer (SUB-09) */}
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Interactive Work Boundary Demarcation (Mandatory) *</span>
                      <span style={{ fontSize: "11px", color: "var(--color-primary)", fontWeight: 700 }}>
                        {boundaryTouched && boundaryPoints.length > 0 ? `${boundaryPoints.length} boundary vertices marked` : "Draw boundary polygon on map"}
                      </span>
                    </label>
                    {errors.boundary && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block" }}>⚠️ {errors.boundary}</span>}
                    <div style={{ marginTop: "6px", borderRadius: "10px", border: "1px solid var(--border-color)", padding: "10px" }}>
                      <BoundaryMapDrawer
                        center={{ lat: 1.2505, lng: 103.8235 }}
                        initialBoundary={boundaryPoints}
                        heightPx={480}
                        maxRadiusMeters={5000}
                        label=""
                        onBoundaryChange={(pts) => {
                          setBoundaryPoints(pts || []);
                          setBoundaryTouched(true);
                        }}
                        onSelectLocation={(loc) => {
                          setNewForm((prev) => ({
                            ...prev,
                            roadName: loc.roadName || prev.roadName,
                            buildingCommonName: loc.buildingCommonName || loc.label || prev.buildingCommonName,
                            postalCode: loc.postalCode || prev.postalCode,
                            level: loc.level || prev.level,
                            locationTags: loc.tags && loc.tags.length > 0
                              ? Array.from(new Set([...prev.locationTags, ...loc.tags]))
                              : prev.locationTags
                          }));
                        }}
                      />
                    </div>
                  </div>
                  {/* Applicant Remarks (FRD §4 Remarks and Declaration) */}
                  <div>
                    <label htmlFor="applicantRemarks" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Remarks</label>
                    <textarea
                      id="applicantRemarks"
                      rows={2}
                      value={newForm.applicantRemarks}
                      onChange={(e) => setNewForm({ ...newForm, applicantRemarks: e.target.value })}
                      className="form-control"
                      style={{ width: "100%", marginTop: "4px" }}
                      placeholder="Any additional information for the Liaison Officer or Approvers (optional)"
                    />
                  </div>

                  {/* Statutory Declaration */}
                  <div style={{ background: "var(--bg-inset)", padding: "10px 12px", borderRadius: "8px", border: errors.declaration ? "1.5px solid #EF4444" : "1px solid var(--border-color)" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        aria-required="true"
                        aria-invalid={!!errors.declaration}
                        checked={newForm.declarationChecked}
                        onChange={(e) => setNewForm({ ...newForm, declarationChecked: e.target.checked })}
                      />
                      <span>I hereby declare that all submitted risk assessments, method statements, and worker particulars are true and comply with SDC Workplace Safety &amp; Health requirements.</span>
                    </label>
                    {errors.declaration && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "4px" }}>⚠️ {errors.declaration}</span>}
                  </div>

                  {/* Privacy Policy Agreement (FRD §4 — distinct from the safety declaration above) */}
                  <div style={{ background: "var(--bg-inset)", padding: "10px 12px", borderRadius: "8px", border: errors.privacyPolicyAgreed ? "1.5px solid #EF4444" : "1px solid var(--border-color)" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        aria-required="true"
                        aria-invalid={!!errors.privacyPolicyAgreed}
                        checked={newForm.privacyPolicyAgreed}
                        onChange={(e) => setNewForm({ ...newForm, privacyPolicyAgreed: e.target.checked })}
                      />
                      <span>I have read and agree to the SDC Privacy Policy governing the collection, use and disclosure of personal data submitted in this application.</span>
                    </label>
                    {errors.privacyPolicyAgreed && <span style={{ color: "#B91C1C", fontSize: "11px", display: "block", marginTop: "4px" }}>⚠️ {errors.privacyPolicyAgreed}</span>}
                  </div>
              </div>
              {/* Wizard Footer Buttons — sticky so actions stay reachable without scrolling to the bottom */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid var(--border-color)",
                  padding: "14px 24px",
                  marginTop: "10px",
                  position: "sticky",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "#FFFFFF",
                  marginLeft: "-24px",
                  marginRight: "-24px",
                  marginBottom: "-24px",
                  borderBottomLeftRadius: "var(--radius-lg)",
                  borderBottomRightRadius: "var(--radius-lg)",
                  boxShadow: "0 -4px 12px rgba(0,0,0,0.06)",
                  zIndex: 5
                }}
              >
                <div>
                  <button type="button" className="btn btn-secondary" onClick={handleSaveDraft} style={{ fontSize: "12.5px" }}>
                    Save Draft Application
                  </button>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => requestLeave(() => router.push("/nops"))}
                  >
                    Cancel
                  </button>
                                    <button type="submit" className="btn btn-primary" style={{ background: "var(--color-primary)", fontWeight: 800 }}>
                    Submit NOP Application
                  </button>
                </div>
              </div>
            </form>
      </div>
    </div>
  );
}