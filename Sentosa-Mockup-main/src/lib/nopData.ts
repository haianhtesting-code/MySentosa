// Shared NOP Data Models, Types and Mock Datasets for SDC Case Management System
import { UserRole } from "../context/RoleContext";
import { hasNopPermission, canAccessNopRecord } from "./nopPermissions";
export { canAccessNopRecord };

export interface NOPWorker {
  id: string;
  name: string;
  role: string;
  idNumber?: string; // Optional identifier
  passType: string;
  verified: boolean;
  // FRD §4 Workers List: "Name, NRIC/FIN, trade or occupation, employer company
  // and work permit number." `passType` only captures the pass *type* (e.g.
  // "Work Permit"); these two fields capture the actual employer and permit
  // number. Optional (rather than required) so the many pre-existing seed
  // worker records elsewhere in this file that predate this fix don't need to
  // be touched to keep typechecking.
  employerCompany?: string;
  workPermitNumber?: string;
  tradeOccupation?: string;
}

export interface NOPDoc {
  id: string;
  name: string;
  type: string;
  status: "Verified" | "Pending Review" | "Under Review" | "Required" | "Overdue";
  uploadedAt?: string;
  fileSize?: string;
  requiredBy?: string;
  isDeferred?: boolean;
  version?: number;
  fileUrl?: string;
  slotId?: string;
}

export interface NOPDeferredDoc {
  id: string;
  name: string;
  slotId?: string;
  docTitle?: string;
  trigger?: string;
  requiredForTrigger?: string;
  category?: string;
  status: "Pending Submission" | "Under Review" | "Accepted" | "Correction Required" | "Approved";
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
  reviewerComments?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  dueDate?: string;
  assignedGroup?: string;
}

export interface DomainApproval {
  domain: string;
  approverName: string;
  approverRole: string;
  status: "Pending" | "Approved" | "Change Requested";
  departmentId?: string;
  decidedAt?: string;
  comments?: string;
  approvedBy?: string;
  approverGroup?: string;
  groupId?: string;
  groupName?: string;
  outstandingDocsAtDecision?: string[];
  ruleId?: string;
  pendingSince?: string;
}

export interface BlackoutDateConfig {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  zones: string[];
  zoneIds?: string[];
  restrictionLevel: "Total Blackout" | "No Heavy Machinery" | "Night Restriction Only";
  status: "Active" | "Scheduled";
}

// FRD §3 Permit Status: exactly these 6 states — no "Rejected" or "Lapsed" in the catalogue.
export type PermitStatus = "Upcoming" | "Active" | "Suspended" | "Expired" | "Cancelled" | "Revoked";
export type ApplicationStatus = "Draft" | "Under Review" | "Change Requested" | "Approved" | "Withdrawn";

export interface NOPApplication {
  id: string; // SEN/NP/YYYYMMDD/NNN
  companyName: string;
  companyUen?: string; // Singapore UEN
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  creatorUsername?: string;
  creatorEmail?: string;
  workDescription: string;
  durationCategory: "BAU Maintenance" | "Ad-hoc Work" | "Project Work";
  contractEndDate?: string; // BA Proposal P2.1 for Project Work
  location: string;
  zone?: string;
  unitRoomNumber?: string; // BA Proposal P2.1: Space breakdown
  spaceDescription?: string; // BA Proposal P2.1: Space breakdown
  startDateTime: string;
  endDateTime: string;
  workingHours: string;
  isUrgent: boolean;
  hasBlackoutOverlap: boolean;
  blackoutReason?: string;
  blackoutWorkReason?: string;
  boundaryCoordinates?: { lat: number; lng: number }[];
  ipaAuthorisedPeriod?: { startDate: string; endDate: string; workingHours: string } | string;
  ipaConditions?: string[] | string;
  cancellationRequest?: {
    requestedAt: string;
    reason: string;
    status: "Pending Pre-screening" | "Under Approver Review" | "Approved" | "Rejected" | "Change Requested";
    comments?: string;
    requestedBy: string;
    clearedBy?: string;
    clearedAt?: string;
    decidedAt?: string;
    decidedBy?: string;
    groupApprovals?: { group: string; status: "Pending" | "Approved" | "Rejected"; decidedBy?: string; decidedAt?: string; comments?: string }[];
  };
  liftingRequest?: {
    requestedAt: string;
    reason: string;
    status: "Pending Pre-screening" | "Under Approver Review" | "Approved" | "Rejected" | "Change Requested";
    comments?: string;
    requestedBy: string;
    clearedBy?: string;
    clearedAt?: string;
    decidedAt?: string;
    decidedBy?: string;
    groupApprovals?: { group: string; status: "Pending" | "Approved" | "Rejected"; decidedBy?: string; decidedAt?: string; comments?: string }[];
  };
  loPreScreenDetails?: {
    clearedBy?: string;
    clearedAt?: string;
    comments?: string;
  };
  extensionRequests?: {
    id: string;
    requestedEndDate: string;
    reason: string;
    status: "Pending Pre-screening" | "Under Approver Review" | "Approved" | "Rejected" | "Change Requested";
    requestedAt: string;
    clearedBy?: string;
    clearedAt?: string;
    decidedAt?: string;
    decidedBy?: string;
    comments?: string;
    groupApprovals?: { group: string; status: "Pending" | "Approved" | "Rejected"; decidedBy?: string; decidedAt?: string; comments?: string }[];
  }[];
  ipaSteps?: { approverGroup: string; status: "Pending" | "Granted" | "Declined"; decidedBy?: string; decidedAt?: string; conditions?: string }[];
  ipaRequestedAt?: string;
  ipaRequestedBy?: string;
  deferredDocuments?: NOPDeferredDoc[];
  deferredDocumentSlots?: NOPDeferredDoc[];
  
  // 4-Dimensional Status Architecture
  applicationStatus: ApplicationStatus;
  permitStatus: PermitStatus;
  ipaStatus: "Pending" | "Granted" | "N/A";
  documentCompletion: "Documents Complete" | "Documents Outstanding" | "Overdue";
  documentDeadline?: string;
  ipaGrantedDate?: string;
  deferredDocDeadline?: string;
  
  triggers: string[];
  documents: NOPDoc[];
  workers: NOPWorker[];
  
  sdcLiaisonOfficer: string;
  liaisonOfficer?: string; // Convenience alias
  backupLiaisonOfficer?: string; // BA Proposal P1.5
  loPreScreenStatus: "Pending Pre-screening" | "Cleared for Approval" | "Change Requested" | "Changes Requested" | "Rejected";
  loComments?: string;
  domainApprovals: DomainApproval[];
  
  amendmentType?: "minor" | "critical"; // BA Proposal P0.4
  amendmentClassification?: "Critical" | "Minor";
  resubmissionCount?: number;
  amendmentNotes?: string;
  rejectionReason?: string; // BA Proposal P2.7
  // FRD §4.2.5 Project & Contact Details
  projectTitle?: string;
  picName?: string;
  picMobile?: string;
  picOfficeNumber?: string;
  loEmail?: string;
  loMobile?: string;
  applicantRemarks?: string;
  emergencyContactName1?: string;
  emergencyContactMobile1?: string;
  emergencyContactName2?: string;
  emergencyContactMobile2?: string;
  otherWorkDetails?: string;
  workingOnBlackoutDates?: boolean;
  nightWorkInvolved?: boolean;
  nightWorkReason?: string;
  nightWorkAcknowledged?: boolean;

  // FRD §4.2.6 High-Risk Work
  confinedSpaceInvolved?: boolean;
  scaffoldingInvolved?: boolean;
  excavationDepth?: string;
  liftingOperations?: boolean;
  // FRD §4: "Equipment Type || Multi-select dropdown || Yes || e.g. Crane and
  // Excavator" — multiple equipment types may apply to a single application.
  equipmentType?: string[];
  otherEquipment?: string;
  vehicleType?: string;

  // FRD §4.2.7 Location of Works
  locationTags?: string[];
  roadName?: string;
  buildingCommonName?: string;
  postalCode?: string;
  level?: string;
  sitePhotoAttached?: boolean;

  // FRD §5.3 Approver Group
  approverGroupName?: string;
  relatedPtwReference?: string;


  submittedAt: string;
  createdAt?: string;
  updatedAt?: string;
  lastAudit?: {
    auditedBy: string;
    auditedAt: string;
    complianceScore: string;
    notes: string;
  };
  extensionHistory?: {
    requestedEndDate: string;
    reason: string;
    status: "Approved" | "Rejected";
    approvedBy: string;
    approvedAt: string;
    appliedAt?: string;
  }[];
  suspensionDetails?: {
    suspendedBy: string;
    suspendedAt: string;
    reason: string;
    suspensionType?: "Contractor Non-compliance" | "SDC Operational Requirement"; // BA Proposal P2.7
    suspensionDaysCredited?: number;
  };
}

export const STATUTORY_TRIGGERS_LIST = [
  "Works within 6 metres of Sentosa Express Track protection zone",
  "Works within 7.5 metres of Sentosa Intra Island Cableway protection zone",
  "Works requiring partial or full closure of a lane or road (TMP Mandatory)",
  "Works involving a change in land level exceeding 1.5 metres",
  "Vegetation removal or earthworks covering > 2,000 sqm",
  "Removal of trees with a girth exceeding 1 metre",
  "High-Risk Work, Equipment and Vehicles",
  "Confined Space Work",
  "Working at Height Above 30 Metres",
  "Temporary Works Along the Seafront",
  "Excavation Work",
  "Works requiring more than 1 hour at a single SDC-managed location, excluding Island Partner premises, Sentosa Golf Club and Sentosa Cove",
  "Retaining Wall Work",
  "Others (Special work involvement subject to SDC manual routing)"
];

export interface RoutingMatrixRule {
  id?: string;
  trigger: string;
  primaryApprover?: string;
  officerName?: string;
  systemRole?: string;
  departmentId?: string;
  approverGroup?: string;
  groupId?: string;
  secondaryReviewer?: string;
  standardSla?: string;
  urgentSla?: string;
  areaOfResponsibility: string;
  status?: "Active" | "Inactive";
  active?: boolean;
  requiredDocs?: string[];
  conditionalFields?: string[];
  baProposal?: boolean;
  reReviewOnCritical?: boolean;
}


export interface ApproverTitleCatalogItem {
  id: string;
  title: string;
  officerName?: string;
  systemRole?: string;
  departmentId?: string;
  description?: string;
}

export interface ApproverGroupCatalogItem {
  id: string;
  name: string;
  authorizedRole?: string;
  departmentId?: string;
  description?: string;
  members?: string[];
}

export const DEFAULT_APPROVER_TITLES: ApproverTitleCatalogItem[] = [
  { id: "t1", title: "General Manager (Sentosa Express)", officerName: "Tan Kian Seng", systemRole: "Technical Approver", departmentId: "express", description: "Transit rail guideway structural buffer and emergency stop integration" },
  { id: "t2", title: "Lead Ropeway Safety Engineer", officerName: "Lim Chee Meng", systemRole: "Technical Approver", departmentId: "cableway", description: "Ropeway cable sag corridor and pylon safety clearance" },
  { id: "t3", title: "Senior Manager (Traffic & Road Safety)", officerName: "Mohd Firdaus", systemRole: "Technical Approver", departmentId: "traffic", description: "Island vehicular arterial circulation and emergency vehicle egress" },
  { id: "t4", title: "Principal Civil & Structural PE", officerName: "Er. Ng Beng Hock", systemRole: "Technical Approver", departmentId: "structural", description: "Topographical alteration, stormwater drainage and boundary wall impact" },
  { id: "t5", title: "Head (Landscape & Ecology)", officerName: "Audrey Seah", systemRole: "Technical Approver", departmentId: "landscape", description: "Heritage tree conservation, flora & fauna protection, sediment basin" },
  { id: "t6", title: "Lead Arborist (Landscape & Tree Conservation)", officerName: "Audrey Seah", systemRole: "Technical Approver", departmentId: "landscape", description: "Arborist clearance for mature and heritage trees with trunk girth exceeding 1 metre" },
  { id: "t7", title: "Head (Workplace Safety & Health)", officerName: "Wong Siew Leng", systemRole: "Technical Approver", departmentId: "wsh", description: "High-risk plant, machinery, heavy transport and lifting plan clearance" },
  { id: "t8", title: "Principal Coastal & Marine Specialist", officerName: "Capt. David Koh", systemRole: "Technical Approver", departmentId: "marine", description: "Tidal work, shoreline excavation and marine vessel coordination" },
  { id: "t9", title: "Geotechnical Specialist PE", officerName: "Er. Dr. Goh Teck Soon", systemRole: "Technical Approver", departmentId: "geotechnical", description: "Excavation exceeding 1.5m depth, retaining structures, ground settlement control" },
  { id: "t10", title: "Precinct / Facilities Manager", officerName: "David Lim", systemRole: "Technical Approver", departmentId: "precinct", description: "Long-duration works impact on precinct amenities, tenants and public guest movement" },
  { id: "t11", title: "Director (Island Operations)", officerName: "Daniel Lim", systemRole: "Duty Manager", departmentId: "ops", description: "General island operations, emergency exceptions and policy escalations" }
];

export const DEFAULT_APPROVER_GROUPS: ApproverGroupCatalogItem[] = [
  { id: "g1", name: "Sentosa Express Engineering Group", authorizedRole: "Technical Approver", description: "Rail & transit engineering pool for rolling stock and track clearance", members: ["Tan Kian Seng"] },
  { id: "g2", name: "Mount Faber Ropeway Safety Team", authorizedRole: "Technical Approver", description: "Cable car safety & ropeway maintenance pool", members: ["Lim Chee Meng"] },
  { id: "g3", name: "Traffic Management & Safety Committee", authorizedRole: "Technical Approver", description: "Island-wide traffic control, TMP and road closure review committee", members: ["Mohd Firdaus"] },
  { id: "g4", name: "C&S PE Structural Review Panel", authorizedRole: "Technical Approver", description: "Civil & structural professional engineering accredited panel", members: ["Er. Ng Beng Hock"] },
  { id: "g5", name: "Landscape & Environmental Directorate", authorizedRole: "Technical Approver", description: "Ecology, greenery, and conservation assurance pool", members: ["Audrey Seah"] },
  { id: "g6", name: "Arboriculture & Heritage Conservation Council", authorizedRole: "Technical Approver", description: "Certified arborists and heritage tree protection pool", members: ["Audrey Seah"] },
  { id: "g7", name: "WSH Safety & Operations Oversight Group", authorizedRole: "Technical Approver", description: "Workplace safety, lifting plans, and high-risk machinery panel", members: ["Wong Siew Leng"] },
  { id: "g8", name: "Coastal & Maritime Engineering Group", authorizedRole: "Technical Approver", description: "Marine works, seabed, and sea-front safety panel", members: ["Capt. David Koh"] },
  { id: "g9", name: "Geotechnical & Utilities Protection Team", authorizedRole: "Technical Approver", description: "Subsurface utilities, deep excavations, and soil stability panel", members: ["Er. Dr. Goh Teck Soon"] },
  { id: "g10", name: "Precinct Operations Management Team", authorizedRole: "Technical Approver", description: "District facilities and precinct stakeholder coordination pool", members: ["David Lim"] },
  { id: "g11", name: "SDC Central Operations Group", authorizedRole: "Duty Manager", description: "Central operations, emergency reviews, and general routing pool", members: ["Daniel Lim", "DM Gan"] }
];

let approverTitlesCache: ApproverTitleCatalogItem[] | null = null;
export function loadStoredApproverTitles(): ApproverTitleCatalogItem[] {
  return approverTitlesCache || DEFAULT_APPROVER_TITLES;
}

export function saveStoredApproverTitles(titles: ApproverTitleCatalogItem[]): void {
  approverTitlesCache = titles;
}

let approverGroupsCache: ApproverGroupCatalogItem[] | null = null;
export function loadStoredApproverGroups(): ApproverGroupCatalogItem[] {
  return approverGroupsCache || DEFAULT_APPROVER_GROUPS;
}

export function saveStoredApproverGroups(groups: ApproverGroupCatalogItem[]): void {
  approverGroupsCache = groups;
}

export const ROUTING_MATRIX_RULES: RoutingMatrixRule[] = [
  {
    id: "r1",
    trigger: "Works within 6 metres of Sentosa Express Track protection zone",
    approverGroup: "Sentosa Express Engineering Group",
    groupId: "g1",
    areaOfResponsibility: "Transit rail guideway structural buffer and emergency stop integration",
    active: true
  },
  {
    id: "r2",
    trigger: "Works within 7.5 metres of Sentosa Intra Island Cableway protection zone",
    approverGroup: "Mount Faber Ropeway Safety Team",
    groupId: "g2",
    areaOfResponsibility: "Ropeway cable sag corridor and pylon safety clearance",
    active: true
  },
  {
    id: "r3",
    trigger: "Works requiring partial or full closure of a lane or road (TMP Mandatory)",
    approverGroup: "Traffic Management & Safety Committee",
    groupId: "g3",
    areaOfResponsibility: "Island vehicular arterial circulation and emergency vehicle egress",
    active: true
  },
  {
    id: "r4",
    trigger: "Works involving a change in land level exceeding 1.5 metres",
    approverGroup: "C&S PE Structural Review Panel",
    groupId: "g4",
    areaOfResponsibility: "Topographical alteration, stormwater drainage and boundary wall impact",
    active: true
  },
  {
    id: "r5",
    trigger: "Vegetation removal or earthworks covering > 2,000 sqm",
    approverGroup: "Landscape & Environmental Directorate",
    groupId: "g5",
    areaOfResponsibility: "Heritage tree conservation, flora & fauna protection, sediment basin",
    active: true
  },
  {
    id: "r6",
    trigger: "Removal of trees with a girth exceeding 1 metre",
    approverGroup: "Arboriculture & Heritage Conservation Council",
    groupId: "g6",
    areaOfResponsibility: "Arborist clearance for mature and heritage trees with trunk girth exceeding 1 metre",
    active: true
  },
  {
    id: "r7",
    trigger: "High-Risk Work, Equipment and Vehicles",
    approverGroup: "WSH Safety & Operations Oversight Group",
    groupId: "g7",
    areaOfResponsibility: "Heavy vehicle movement on pedestrian promenades and boardwalks",
    active: true
  },
  {
    id: "r8",
    trigger: "Confined Space Work",
    approverGroup: "WSH Safety & Operations Oversight Group",
    groupId: "g7",
    areaOfResponsibility: "Gas testing, forced ventilation, entrant log and rescue standby",
    active: true
  },
  {
    id: "r9",
    trigger: "Working at Height Above 30 Metres",
    approverGroup: "WSH Safety & Operations Oversight Group",
    groupId: "g7",
    areaOfResponsibility: "High-altitude access, certified fall prevention systems and wind mitigation",
    active: true
  },
  {
    id: "r10",
    trigger: "Temporary Works Along the Seafront",
    approverGroup: "Coastal & Maritime Engineering Group",
    groupId: "g8",
    areaOfResponsibility: "Tidal wave surge impact, coastal revetment stability and marine environmental protection",
    active: true
  },
  {
    id: "r11",
    trigger: "Excavation Work",
    approverGroup: "Geotechnical & Utilities Protection Team",
    groupId: "g9",
    areaOfResponsibility: "Subterranean utility protection, SP PowerGrid / SingTel corridor",
    active: true
  },
  {
    id: "r12",
    trigger: "Works requiring more than 1 hour at a single SDC-managed location, excluding Island Partner premises, Sentosa Golf Club and Sentosa Cove",
    approverGroup: "Precinct Operations Management Team",
    groupId: "g10",
    areaOfResponsibility: "Precinct guest experience, noise attenuation and pedestrian passage",
    active: true
  },
  {
    id: "r13",
    trigger: "Retaining Wall Work",
    approverGroup: "C&S PE Structural Review Panel",
    groupId: "g4",
    areaOfResponsibility: "Earth retaining structure integrity, lateral pressure, tie-back anchors",
    active: true
  },
  {
    id: "r14",
    trigger: "Others (Special work involvement subject to SDC manual routing)",
    approverGroup: "SDC Central Operations Group",
    groupId: "g11",
    areaOfResponsibility: "Custom statutory classification triaged by SDC Ops Admin",
    active: true
  }
];

export function getShortTriggerName(trigger: string): string {
  const t = trigger.toLowerCase();
  if (t.includes("6 metres") || t.includes("sentosa express")) return "Sentosa Express (6m)";
  if (t.includes("7.5 metres") || t.includes("cableway")) return "Cableway (7.5m)";
  if (t.includes("closure of a lane") || t.includes("road") || t.includes("traffic")) return "Road Closure (TMP)";
  if (t.includes("land level")) return "Land Level Change (>1.5m)";
  if (t.includes("2,000") || (t.includes("vegetation") && !t.includes("tree"))) return "Vegetation / Earthworks (>2,000m²)";
  if (t.includes("girth") || t.includes("tree removal") || t.includes("arborist") || (t.includes("tree") && !t.includes("street"))) return "Tree Protection (Girth > 1m)";
  if (t.includes("confined space")) return "Confined Space";
  if (t.includes("height above 30") || t.includes("working at height")) return "Working at Height (>30m)";
  if (t.includes("seafront") || t.includes("coastal")) return "Seafront / Coastal Works";
  if (t.includes("excavation")) return "Excavation Work (>1.5m)";
  if (t.includes("1 hour")) return "Duration > 1h";
  if (t.includes("retaining wall")) return "Retaining Wall";
  if (t.includes("high-risk") || t.includes("equipment")) return "High-Risk Equipment";
  if (t.includes("others")) return "Others (Custom Routing)";
  // Historical / fallback patterns
  if (t.includes("slope")) return "Slopes > 15°";
  if (t.includes("scaffold")) return "Scaffolding > 4m";
  if (t.includes("hot work") || t.includes("welding")) return "Hot Works / Flame";
  if (t.includes("lifting") || t.includes("crane")) return "Crane Lifting Ops";
  return "Statutory Trigger";
}

export function derivePermitStatus(nop: Partial<NOPApplication>, now?: Date): NOPApplication["permitStatus"] {
  const currentTime = now ? now.getTime() : Date.now();
  const startTime = nop.startDateTime ? new Date(nop.startDateTime).getTime() : NaN;
  const endTime = nop.endDateTime ? new Date(nop.endDateTime).getTime() : NaN;

  // FRD §3.4.6: If a suspended permit passes its end date, it transitions to Expired
  if (nop.permitStatus === "Suspended") {
    if (!isNaN(endTime) && currentTime > endTime) {
      return "Expired";
    }
    return "Suspended";
  }

  // 1. Terminal and manual overrides take absolute precedence (FRD §6.1)
  if (nop.permitStatus && ["Cancelled", "Revoked"].includes(nop.permitStatus)) {
    return nop.permitStatus;
  }

  // 2. If application is not fully approved, preserve non-operational permit status
  if (nop.applicationStatus !== "Approved") {
    return nop.permitStatus || "Upcoming";
  }

  // 3. Dynamic time-based derivation (FRD §6.1)
  if (isNaN(startTime) || isNaN(endTime)) {
    return nop.permitStatus || "Upcoming";
  }

  if (currentTime < startTime) {
    return "Upcoming";
  } else if (currentTime >= startTime && currentTime <= endTime) {
    return "Active";
  } else {
    return "Expired";
  }
}

/**
 * Mask NRIC/FIN format per PDPA (e.g. S****123A).
 * Preserves initial prefix and last 4 characters, masking middle 4 digits.
 */
export function maskNric(nric?: string): string {
  if (!nric || nric.length < 5) return nric || "";
  const first = nric[0];
  const lastFour = nric.slice(-4);
  return `${first}****${lastFour}`;
}

/**
 * Common helper across all screens to verify if the current user is authorized as the contractor applicant.
 * Checks role permissions, company matching, and Stakeholder Manager authorization flag (SEC-05, SEC-07).
 */
export function isContractorApplicant(
  user: { role: string; username?: string; email?: string; companyName?: string; canActAsApplicant?: boolean },
  nop?: Partial<NOPApplication>
): boolean {
  if (user.role === "Applicant (Contractor)") {
    if (!nop) return true;
    const userCompany = user.companyName || "Kim Seng Construction Pte Ltd";
    if (nop.companyName) {
      return (
        nop.companyName.toLowerCase().includes(userCompany.toLowerCase()) ||
        userCompany.toLowerCase().includes(nop.companyName.toLowerCase()) ||
        (userCompany.toLowerCase().includes("kim seng") && nop.companyName.toLowerCase().includes("kim seng"))
      );
    }
    return true;
  }
  if (user.role === "Stakeholder Manager") {
    if (user.canActAsApplicant === false) return false;
    if (!nop) return true;
    const userCompany = user.companyName || "Kim Seng Construction Pte Ltd";
    if (nop.companyName) {
      return (
        nop.companyName.toLowerCase().includes(userCompany.toLowerCase()) ||
        userCompany.toLowerCase().includes(nop.companyName.toLowerCase()) ||
        (userCompany.toLowerCase().includes("kim seng") && nop.companyName.toLowerCase().includes("kim seng"))
      );
    }
    return true;
  }
  return false;
}

/**
 * FRD §3.3, §5, §6.5, §10 & DOC-01: Decoupled work authorization entitlement checker.
 * Determines whether physical on-site work is currently permitted for a given application.
 *
 * Rules (DOC-01):
 * 1. Approved application: authorized for work when permit status is Active. Outstanding/deferred docs do not affect work authorization.
 * 2. Unapproved application (Under Review / Change Requested) with Granted IPA: authorized for work during NOP / IPA dates.
 * 3. All other states (Draft, Withdrawn, Suspended, Revoked, Cancelled, Expired): NOT authorized for work.
 */
export function isWorkAuthorized(
  nop: Partial<NOPApplication>,
  now?: Date
): { allowed: boolean; reason: string; scope?: string; isIpa?: boolean } {
  const currentTime = now ? now.getTime() : Date.now();

  if (nop.applicationStatus === "Draft") {
    return { allowed: false, reason: "Draft application — not submitted for approval" };
  }
  if (nop.applicationStatus === "Withdrawn") {
    return { allowed: false, reason: "Application has been withdrawn" };
  }
  if (nop.permitStatus === "Cancelled") {
    return { allowed: false, reason: "Permit has been cancelled" };
  }
  if (nop.permitStatus === "Revoked") {
    return { allowed: false, reason: "Permit has been revoked by SDC" };
  }
  if (nop.permitStatus === "Suspended") {
    return { allowed: false, reason: "Work is temporarily suspended by SDC" };
  }

  // Branch 1: Approved application (DOC-01)
  // Authorized when derived permit status is Active. Deferred or overdue docs do not affect work authorization.
  if (nop.applicationStatus === "Approved") {
    const derivedStatus = derivePermitStatus(nop, now);
    if (derivedStatus === "Active") {
      return { allowed: true, reason: "Permit active and fully approved", scope: nop.workDescription };
    }
    if (derivedStatus === "Upcoming") {
      return { allowed: false, reason: "Permit scheduled for future date — work not yet active" };
    }
    if (derivedStatus === "Expired") {
      return { allowed: false, reason: "Permit validity period has expired" };
    }
    if (derivedStatus === "Suspended") {
      return { allowed: false, reason: "Work is temporarily suspended by SDC" };
    }
    return { allowed: false, reason: `Permit is not active (${derivedStatus})` };
  }

  // Branch 2: Unapproved application with Granted IPA (DOC-01)
  // Authorized during stated NOP start/end window (unclipped by documentDeadline)
  if (
    (nop.applicationStatus === "Under Review" || nop.applicationStatus === "Change Requested") &&
    nop.ipaStatus === "Granted"
  ) {
    const startTime = nop.startDateTime ? new Date(nop.startDateTime).getTime() : NaN;
    const ipaEndTime = nop.endDateTime ? new Date(nop.endDateTime).getTime() : NaN;

    if (!isNaN(startTime) && currentTime < startTime) {
      return { allowed: false, reason: "IPA authorization window has not started", isIpa: true };
    }
    if (!isNaN(ipaEndTime) && currentTime > ipaEndTime) {
      return {
        allowed: false,
        reason: "IPA work authorization window expired — on-site physical works are strictly NOT permitted",
        isIpa: true
      };
    }

    return {
      allowed: true,
      reason: "In-Principle Approval (IPA) active — preparatory works only",
      scope: (Array.isArray(nop.ipaConditions) ? nop.ipaConditions.join("; ") : nop.ipaConditions) || "Preparatory works authorized under conditional SLA",
      isIpa: true
    };
  }

  return { allowed: false, reason: "Application is under review — not authorized for work" };
}

export interface RequiredDocumentSummary {
  baselineRequired: string[];
  baselineMissing: string[];
  baselineReceived: string[];
  conditionalRequired: string[];
  conditionalMissing: string[];
  conditionalReceived: string[];
  deferredUnderReview: string[];
  deferredMissing: string[];
  deferredAccepted: string[];
  totalReceived: number;
  totalMissing: number;
  totalOverdue: number;
}

/**
 * FRD §4.3 & §6.5: Canonical requirement schedule and received/missing counter.
 * Provides unified, consistent counts across LO Pre-screening, Dossier Overview, Register, and Approver Queue.
 */
export function getRequiredDocumentsSchedule(nop: Partial<NOPApplication>): RequiredDocumentSummary {
  const docs = nop.documents || [];
  const defDocs = nop.deferredDocuments || [];

  const baselineIds = ["doc-ra", "doc-mos", "doc-loc"];
  const baselineNames: Record<string, string> = {
    "doc-ra": "Risk Assessment Form (RA)",
    "doc-mos": "Method Statement (MOS)",
    "doc-loc": "Detailed Location Plan"
  };

  const hasDoc = (slotId: string, namePattern: RegExp) => {
    return docs.some(d => !d.isDeferred && (d.slotId === slotId || namePattern.test(d.name)));
  };

  const baselineReceived: string[] = [];
  const baselineMissing: string[] = [];

  if (hasDoc("doc-ra", /risk\s*assessment|ra\b/i)) {
    baselineReceived.push(baselineNames["doc-ra"]);
  } else {
    baselineMissing.push(baselineNames["doc-ra"]);
  }

  if (hasDoc("doc-mos", /method\s*statement|mos\b|safe\s*work\s*procedure/i)) {
    baselineReceived.push(baselineNames["doc-mos"]);
  } else {
    baselineMissing.push(baselineNames["doc-mos"]);
  }

  if (hasDoc("doc-loc", /location\s*plan|site\s*photo/i)) {
    baselineReceived.push(baselineNames["doc-loc"]);
  } else {
    baselineMissing.push(baselineNames["doc-loc"]);
  }

  const conditionalRequired: string[] = [];
  const conditionalReceived: string[] = [];
  const conditionalMissing: string[] = [];

  const deferredUnderReview: string[] = [];
  const deferredMissing: string[] = [];
  const deferredAccepted: string[] = [];

  defDocs.forEach(d => {
    if (d.status === "Accepted") {
      deferredAccepted.push(d.name);
    } else if (d.status === "Under Review" || d.fileUrl) {
      deferredUnderReview.push(d.name);
    } else {
      deferredMissing.push(d.name);
    }
  });

  const totalReceived = baselineReceived.length + conditionalReceived.length + deferredUnderReview.length + deferredAccepted.length;
  const totalMissing = baselineMissing.length + conditionalMissing.length;
  const totalOverdue = nop.documentCompletion === "Overdue" ? deferredMissing.length : 0;

  return {
    baselineRequired: baselineIds.map(id => baselineNames[id]),
    baselineMissing,
    baselineReceived,
    conditionalRequired,
    conditionalMissing,
    conditionalReceived,
    deferredUnderReview,
    deferredMissing,
    deferredAccepted,
    totalReceived,
    totalMissing: totalMissing + (nop.ipaStatus === "Granted" ? deferredMissing.length : 0),
    totalOverdue
  };
}

export function resolveApprovers(triggers: string[], rules?: RoutingMatrixRule[]): DomainApproval[] {
  const domainMap = new Map<string, DomainApproval>();
  const activeRules = (rules || (typeof window !== "undefined" ? loadStoredRouting() : ROUTING_MATRIX_RULES)).filter(r => r.active !== false);

  triggers.forEach(t => {
    const tLower = t.toLowerCase();
    const matched = activeRules.find(r => {
      const rLower = (r.trigger || "").toLowerCase();
      if (!rLower) return false;
      if (tLower.includes("sentosa express") || rLower.includes("sentosa express")) {
        return tLower.includes("sentosa express") && rLower.includes("sentosa express");
      }
      if (tLower.includes("cableway") || rLower.includes("cableway")) {
        return tLower.includes("cableway") && rLower.includes("cableway");
      }
      if (tLower.includes("closure of a lane") || rLower.includes("closure of a lane")) {
        return (tLower.includes("closure of a lane") || tLower.includes("road") || tLower.includes("traffic")) && rLower.includes("closure of a lane");
      }
      if (tLower.includes("land level") || rLower.includes("land level")) {
        return tLower.includes("land level") && rLower.includes("land level");
      }
      if (tLower.includes("2,000") || (tLower.includes("vegetation") && !tLower.includes("tree"))) {
        return rLower.includes("2,000") || rLower.includes("vegetation");
      }
      if (tLower.includes("girth") || tLower.includes("tree removal") || (tLower.includes("tree") && !tLower.includes("street"))) {
        return rLower.includes("girth") || rLower.includes("tree removal");
      }
      if (tLower.includes("confined space")) {
        return rLower.includes("confined space");
      }
      if (tLower.includes("height above 30") || tLower.includes("working at height")) {
        return rLower.includes("height above 30");
      }
      if (tLower.includes("seafront") || tLower.includes("coastal")) {
        return rLower.includes("seafront");
      }
      if (tLower.includes("excavation")) {
        return rLower.includes("excavation");
      }
      if (tLower.includes("1 hour") || tLower.includes("duration > 1h")) {
        return rLower.includes("1 hour");
      }
      if (tLower.includes("retaining wall")) {
        return rLower.includes("retaining wall");
      }
      if (tLower.includes("high-risk")) {
        return rLower.includes("high-risk");
      }
      if (tLower.includes("others")) {
        return rLower.includes("others");
      }
      return tLower.includes(rLower.substring(0, 15)) || rLower.includes(tLower.substring(0, 15));
    });

    if (matched) {
      const groupKey = matched.approverGroup || matched.id || matched.trigger;
      if (!domainMap.has(groupKey)) {
        const grp = DEFAULT_APPROVER_GROUPS.find(g => g.name === matched.approverGroup || g.id === matched.groupId);
        const repName = matched.officerName || (grp && grp.members && grp.members[0]) || "Authorized Group Member";
        domainMap.set(groupKey, {
          domain: matched.trigger,
          approverName: repName,
          approverRole: matched.approverGroup || "Technical Approver Group",
          departmentId: matched.departmentId || grp?.departmentId,
          approverGroup: matched.approverGroup,
          ruleId: matched.id,
          status: "Pending",
          pendingSince: new Date().toISOString()
        });
      }
    }
  });

  if (domainMap.size === 0) {
    domainMap.set("Operations Resilience & WSH", {
      domain: "Operations Resilience & WSH",
      approverName: "Wong Siew Leng",
      approverRole: "Head, WSH",
      departmentId: "wsh",
      approverGroup: "WSH Safety & Operations Oversight Group",
      status: "Pending",
      pendingSince: new Date().toISOString()
    });
  }

  return Array.from(domainMap.values());
}

export interface ContractorPersona {
  username: string;
  company: string;
  title: string;
}

export const CONTRACTOR_PERSONAS: ContractorPersona[] = [
  { username: "David Tan", company: "Kim Seng Construction Pte Ltd", title: "Project Director (Kim Seng Construction)" },
  { username: "Lim Wei Ling", company: "GreenScape Arboriculture Pte Ltd", title: "Certified Arborist (GreenScape)" },
  { username: "Ahmad Razif", company: "SenTech Utilities Pte Ltd", title: "Infrastructure Manager (SenTech)" }
];

export interface TechnicalApproverPersona {
  username: string;
  title: string;
  departmentId: string;
  departmentName: string;
}

export const LIAISON_OFFICER_PERSONAS: TechnicalApproverPersona[] = [
  { username: "Gary Ng", title: "Senior Facilities Manager (IFM)", departmentId: "lo-ifm", departmentName: "Estate & Precinct Management" },
  { username: "Jonathan Teo", title: "Liaison Officer (Sentosa Express)", departmentId: "lo-express", departmentName: "Sentosa Express Engineering" },
  { username: "Marcus Koh", title: "Liaison Officer (Attractions & Commercial)", departmentId: "lo-attractions", departmentName: "Commercial & Attractions" },
  { username: "Eric Tan", title: "Liaison Officer (Traffic & Gateway)", departmentId: "lo-traffic", departmentName: "Traffic Management & Safety" },
  { username: "Tan Boon Teck", title: "Liaison Officer (C&S Engineering)", departmentId: "lo-cns", departmentName: "Civil & Structural Engineering" }
];

export const TECHNICAL_APPROVER_PERSONAS: TechnicalApproverPersona[] = [
  { username: "Wong Siew Leng", title: "Head (Workplace Safety & Health)", departmentId: "wsh", departmentName: "Workplace Safety & Health" },
  { username: "Tan Kian Seng", title: "General Manager (Sentosa Express)", departmentId: "express", departmentName: "Sentosa Express Engineering" },
  { username: "Lim Chee Meng", title: "Lead Ropeway Safety Engineer", departmentId: "cableway", departmentName: "Mount Faber Ropeway Safety" },
  { username: "Mohd Firdaus", title: "Senior Manager (Traffic & Road Safety)", departmentId: "traffic", departmentName: "Traffic Management & Safety" },
  { username: "Er. Ng Beng Hock", title: "Principal Civil & Structural PE", departmentId: "structural", departmentName: "C&S PE Structural Panel" },
  { username: "Er. Dr. Goh Teck Soon", title: "Geotechnical Specialist PE", departmentId: "geotechnical", departmentName: "Geotechnical & Utilities" },
  { username: "Audrey Seah", title: "Head (Landscape & Tree Conservation)", departmentId: "landscape", departmentName: "Landscape & Environmental" },
  { username: "Capt. David Koh", title: "Principal Coastal & Marine Specialist", departmentId: "marine", departmentName: "Coastal & Maritime Engineering" },
  { username: "David Lim", title: "Senior Facilities Manager", departmentId: "precinct", departmentName: "Precinct Operations (IFM)" },
  { username: "Daniel Lim", title: "Director (Island Operations)", departmentId: "ops", departmentName: "SDC Central Operations" }
];

export function getApproverPersonForRole(roleTitle: string): string {
  if (roleTitle.includes("Sentosa Express")) return "Tan Kian Seng";
  if (roleTitle.includes("Cableway") || roleTitle.includes("Ropeway")) return "Lim Chee Meng";
  if (roleTitle.includes("Traffic") || roleTitle.includes("Road")) return "Mohd Firdaus";
  if (roleTitle.includes("Safety") || roleTitle.includes("WSH") || roleTitle.includes("High-Risk") || roleTitle.includes("Confined")) return "Wong Siew Leng";
  if (roleTitle.includes("Structural PE") || roleTitle.includes("Civil") || roleTitle.includes("Land Level")) return "Er. Ng Beng Hock";
  if (roleTitle.includes("Geotechnical") || roleTitle.includes("Excavation") || roleTitle.includes("Retaining")) return "Er. Dr. Goh Teck Soon";
  if (roleTitle.includes("Landscape") || roleTitle.includes("Tree") || roleTitle.includes("Ecology") || roleTitle.includes("Vegetation")) return "Audrey Seah";
  if (roleTitle.includes("Coastal") || roleTitle.includes("Marine") || roleTitle.includes("Seafront")) return "Capt. David Koh";
  if (roleTitle.includes("Precinct") || roleTitle.includes("Facilities") || roleTitle.includes("1 hour")) return "David Lim";
  return "Daniel Lim";
}

export interface DocScheduleItem {
  id: string;
  name: string;
  category: "Baseline" | "Conditional" | "Optional";
  requiredForTrigger?: string;
  /** Additional gate for doc-geotech: only required when excavationDepth (metres) exceeds this. */
  minExcavationDepthMetres?: number;
  /** FRD §5: for an Urgent NOP, this document may be submitted after IPA is granted
   * rather than at initial submission. Baseline documents are never deferrable. */
  deferrableWhenUrgent?: boolean;
  allowedFormats: string[]; // PDF, PNG, JPG, BMP, GIF per FRD §4.4.2
  maxBytes: number; // 4MB per FRD §4.4.2
  description: string;
}

export const SUPPORTING_DOCUMENT_SCHEDULE: DocScheduleItem[] = [
  // Baseline (Mandatory for ALL applications)
  { id: "doc-ra", name: "Risk Assessment Form (RA)", category: "Baseline", allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "Approved MOM Risk Assessment matrix signed by WSH Officer" },
  { id: "doc-mos", name: "Method Statement incl. Scope of Works (MOS)", category: "Baseline", allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "Detailed execution methodology and safety precautions" },
  { id: "doc-loc", name: "Detailed Location Plan", category: "Baseline", allowedFormats: ["PDF", "PNG", "JPG"], maxBytes: 4 * 1024 * 1024, description: "Detailed site boundary demarcation plan" },

  // Conditional (Triggered by specific Work Involvements) — per FRD Supporting Document Schedule
  { id: "doc-tmp", name: "Traffic Management Plan (TMP)", category: "Conditional", requiredForTrigger: "closure of a lane or road", deferrableWhenUrgent: false, allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "LTA/SDC compliant traffic routing and detour plan" },
  { id: "doc-scaff", name: "PE-Endorsed Calculation Documents for Working at Height", category: "Conditional", requiredForTrigger: "Working at Height Above 30 Metres", deferrableWhenUrgent: true, allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "Structural PE endorsement for scaffolding used in Working at Height Above 30 Metres" },
  { id: "doc-cspe", name: "C&S PE Documentation for Excavation Work", category: "Conditional", requiredForTrigger: "Excavation Work", deferrableWhenUrgent: true, allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "Civil & Structural Professional Engineer documentation, required whenever Excavation Work is selected" },
  { id: "doc-geotech", name: "Geotechnical PE Documentation", category: "Conditional", requiredForTrigger: "Excavation Work", minExcavationDepthMetres: 6, deferrableWhenUrgent: true, allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "Additional to C&S PE Documentation. Required when Excavation Depth exceeds 6 metres" },
  { id: "doc-seafront", name: "PE-Endorsed Lateral-Load Calculations for Temporary Works Along the Seafront", category: "Conditional", requiredForTrigger: "Temporary Works Along the Seafront", deferrableWhenUrgent: true, allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "Professional Engineer lateral-load endorsement for temporary seafront works" },
  { id: "doc-crane", name: "Lifting Plan and Critical Operations Submission", category: "Conditional", requiredForTrigger: "Lifting operations", deferrableWhenUrgent: true, allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "Lifting plan, calculations, site/access details, Safe Work Procedure and PE endorsement where applicable" },
  { id: "doc-equip-personnel", name: "Equipment and Personnel List", category: "Conditional", requiredForTrigger: "High-Risk Work, Equipment and Vehicles", deferrableWhenUrgent: true, allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "Applicable certificates, valid licences, equipment permits, inspector/QP endorsements and training records" },
  { id: "doc-stakeholder-coord", name: "Stakeholder Coordination Documents", category: "Conditional", requiredForTrigger: "closure of a lane or road", deferrableWhenUrgent: true, allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "Stakeholder notifications, emergency contacts and Emergency Response Plan" },
  { id: "doc-regulatory-compliance", name: "Regulatory Compliance Evidence", category: "Conditional", requiredForTrigger: "High-Risk Work, Equipment and Vehicles", deferrableWhenUrgent: true, allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "Applicable WSH/BCA approvals, PE or Licensed Electrical Worker endorsement, insurance documents including public liability insurance" },

  // Optional / Statutory SDC Authorizations per FRD §4.4.1 (SUB-14, SUB-17)
  { id: "doc-env-consult", name: "Environment Consultation Form", category: "Optional", allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "SDC Environmental consultation submission form" },
  { id: "doc-ura-mnd", name: "URA/MND Written Directions", category: "Optional", allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "Statutory planning clearance from URA / MND" },
  { id: "doc-eia", name: "Approved EIA Report", category: "Optional", allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "Approved Environmental Impact Assessment report" },
  { id: "doc-emmp", name: "Approved EMMP Inception Report", category: "Optional", allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "Environmental Management & Monitoring Plan" },
  { id: "doc-other-authority-approval", name: "Other Relevant Authority Approval or Permit", category: "Optional", allowedFormats: ["PDF", "PNG", "JPG"], maxBytes: 4 * 1024 * 1024, description: "Any other relevant authority approval or permit obtained for the works" },
  { id: "doc-work-schedule", name: "Work Schedule", category: "Optional", allowedFormats: ["PDF"], maxBytes: 4 * 1024 * 1024, description: "Detailed programme and work schedule" },
  { id: "doc-site-photos", name: "Proposed Site Photos", category: "Optional", allowedFormats: ["PNG", "JPG", "PDF"], maxBytes: 4 * 1024 * 1024, description: "Site photos before commencement of works" },
  { id: "doc-others", name: "Others", category: "Optional", allowedFormats: ["PDF", "PNG", "JPG", "BMP", "GIF"], maxBytes: 4 * 1024 * 1024, description: "The applicant elects to provide additional supporting information" }
];

/* ────────────────────────────────────────────────────────────────
   Urgent NOP Classification — admin-configurable deferrable flags
   (WEB-21). FRD §4.2 Urgent NOP Classification: "shall be able to
   configure which supporting-document categories remain mandatory
   for the initial Urgent NOP submission." Persists an override map
   of document-id -> deferrable-when-urgent boolean, seeded from the
   hardcoded SUPPORTING_DOCUMENT_SCHEDULE defaults when unset. Follows
   the same localStorage-backed pattern as loadStoredBlackouts /
   loadStoredRouting above.
   ──────────────────────────────────────────────────────────────── */

const URGENT_DOC_CLASSIFICATION_KEY = "sdc_nops_urgent_doc_classification_v1";

export type UrgentDocClassificationMap = Record<string, boolean>;

export function defaultUrgentDocClassification(): UrgentDocClassificationMap {
  const map: UrgentDocClassificationMap = {};
  SUPPORTING_DOCUMENT_SCHEDULE.forEach((doc) => {
    map[doc.id] = !!doc.deferrableWhenUrgent;
  });
  return map;
}

let urgentDocCache: UrgentDocClassificationMap | null = null;
export function loadStoredUrgentDocClassification(): UrgentDocClassificationMap {
  return urgentDocCache || defaultUrgentDocClassification();
}

export function saveStoredUrgentDocClassification(map: UrgentDocClassificationMap): void {
  urgentDocCache = map;
}

/**
 * Resolves whether a supporting document may be deferred on an Urgent NOP's
 * initial submission, preferring the NOP Operations Admin's configured
 * override (Urgent NOP Classification settings) and falling back to the
 * document schedule's own hardcoded default when no override is stored.
 */
export function isDeferrableWhenUrgent(docId: string): boolean {
  const stored = loadStoredUrgentDocClassification();
  if (Object.prototype.hasOwnProperty.call(stored, docId)) {
    return !!stored[docId];
  }
  const scheduleDoc = SUPPORTING_DOCUMENT_SCHEDULE.find((d) => d.id === docId);
  return !!scheduleDoc?.deferrableWhenUrgent;
}

/**
 * FRD §4 Attachment Upload Rules: "When the trigger for a Conditional supporting
 * document is met, the CMS shall display the corresponding labelled upload field...
 * and require the document." Resolves which Conditional documents apply given the
 * applicant's selected Work Involvement triggers, excavation depth, scaffolding and lifting operations.
 */
export function getApplicableConditionalDocs(
  selectedTriggers: string[],
  excavationDepthMetres?: number,
  scaffoldingInvolved?: boolean | string,
  liftingOperations?: boolean
): DocScheduleItem[] {
  return SUPPORTING_DOCUMENT_SCHEDULE.filter((doc) => {
    if (doc.category !== "Conditional") return false;

    // SUB-01: Scaffolding Calculation for Working at Height
    if (doc.id === "doc-scaff") {
      const hasHeightTrigger = selectedTriggers.some((t) =>
        t.toLowerCase().includes("height") || t.toLowerCase().includes("30 metre") || t.toLowerCase().includes("scaffold")
      );
      const isScaff = scaffoldingInvolved === true || scaffoldingInvolved === "Yes" || scaffoldingInvolved === "yes" ||
        selectedTriggers.some((t) => t.toLowerCase().includes("scaffold"));
      return hasHeightTrigger && isScaff;
    }

    // SUB-02: Lifting Plan
    if (doc.id === "doc-crane") {
      const hasLiftingTrigger = selectedTriggers.some((t) =>
        t.toLowerCase().includes("lifting") || t.toLowerCase().includes("crane")
      );
      return Boolean(liftingOperations) || hasLiftingTrigger;
    }

    if (!doc.requiredForTrigger) return false;
    const matches = selectedTriggers.some((t) => t.toLowerCase().includes(doc.requiredForTrigger!.toLowerCase()));
    if (!matches) return false;
    if (doc.minExcavationDepthMetres !== undefined) {
      const depth = Number(excavationDepthMetres);
      if (!depth || isNaN(depth) || depth <= doc.minExcavationDepthMetres) return false;
    }
    return true;
  });
}

/**
 * FRD §3 NOP Reference Number: "NNN: Sequential counter, zero-padded to three
 * digits and reset daily." Derives the next sequence number for a given date
 * from the highest existing NNN issued that day, not from the total record
 * count — a plain `nops.length + 1` collides once any record for that date is
 * deleted or the in-memory list is filtered/incomplete.
 *
 * @param datePrefix YYYYMMDD
 * @param suffixPrefix set to "DRAFT-" for draft reference numbers, omit for issued ones.
 */
/**
 * FRD §6 NOP Extension:
 *  - "Each NOP is eligible for one extension of up to one month from the last
 *    day of valid work day."
 *  - "The extension may be requested by the applicant before the approved
 *    validity period has expired."
 *  - "Only the validity end date shall be editable through an extension
 *    request." (checked by callers, not this validator.)
 * Shared by the Portal (contractor) and internal Register request flows so
 * both enforce identical rules.
 */
/** Fields whose change on resubmission FRD §5 treats as a Critical amendment. */
export interface AmendmentDiff {
  workDescription?: string;
  startDateTime?: string;
  endDateTime?: string;
  location?: string;
  zone?: string;
}

/**
 * FRD §5 Routing on Resubmission: "Amendments to the scope of works, work
 * dates or area of works shall be treated as critical changes and routed to
 * all affected Approvers for review. Minor amendments, including additions to
 * the worker list, shall not invalidate approvals already granted."
 */
export function classifyAmendment(
  original: Pick<NOPApplication, "workDescription" | "startDateTime" | "endDateTime" | "location" | "zone">,
  changes: AmendmentDiff
): "Critical" | "Minor" {
  const criticalFields: (keyof AmendmentDiff)[] = ["workDescription", "startDateTime", "endDateTime", "location", "zone"];
  const isCritical = criticalFields.some((field) => changes[field] !== undefined && changes[field] !== original[field]);
  return isCritical ? "Critical" : "Minor";
}

/**
 * FRD §5 Routing on Resubmission table:
 *  - Previously approved, unaffected by changes -> Approval Retained (no action)
 *  - Previously approved, affected by a Critical change -> Re-approval Required (Pending)
 *  - Approver previously requested changes -> always requires that Approver's re-review (Pending)
 */
export function resetApprovalsForResubmission(
  domainApprovals: DomainApproval[],
  classification: "Critical" | "Minor",
  rules: RoutingMatrixRule[] = ROUTING_MATRIX_RULES
): DomainApproval[] {
  return domainApprovals.map((approval) => {
    if (approval.status === "Change Requested") {
      return { ...approval, status: "Pending" as const, comments: undefined, pendingSince: new Date().toISOString() };
    }
    if (classification === "Critical" && approval.status === "Approved") {
      const matchedRule =
        (approval.ruleId && rules.find((r) => r.id === approval.ruleId)) ||
        rules.find((r) => r.trigger === approval.domain || (approval.domain && (approval.domain.includes(r.trigger) || r.trigger.includes(approval.domain))));
      const shouldReReview = matchedRule ? matchedRule.reReviewOnCritical !== false : true;
      if (shouldReReview) {
        return { ...approval, status: "Pending" as const, approvedBy: undefined, decidedAt: undefined, pendingSince: new Date().toISOString() };
      }
    }
    return approval;
  });
}

export function validateExtensionRequest(
  nop: Pick<NOPApplication, "endDateTime" | "extensionRequests" | "startDateTime" | "applicationStatus" | "permitStatus">,
  requestedEndDate: string,
  now?: Date
): { valid: boolean; error?: string } {
  const hasApproved = (nop.extensionRequests || []).some((r) => r.status === "Approved");
  if (hasApproved) {
    return { valid: false, error: "Permit extension limit reached: A permit may only be extended once." };
  }
  const hasPending = (nop.extensionRequests || []).some(
    (r) => r.status === "Pending Pre-screening" || r.status === "Under Approver Review"
  );
  if (hasPending) {
    return { valid: false, error: "An extension request is already pending review for this permit." };
  }
  if (derivePermitStatus(nop, now) === "Expired") {
    return { valid: false, error: "Extension must be requested before the permit's validity period expires." };
  }
  const currentEnd = new Date(nop.endDateTime.substring(0, 10));
  const requestedEnd = new Date(requestedEndDate);
  if (requestedEnd <= currentEnd) {
    return { valid: false, error: "New Extended End Date must be after the current permit expiration date." };
  }
  const maxDate = new Date(currentEnd);
  maxDate.setMonth(maxDate.getMonth() + 1);
  if (requestedEnd > maxDate) {
    return { valid: false, error: "Permit extension cannot exceed 1 month beyond current expiration date." };
  }
  return { valid: true };
}

export function generateNopSequenceNumber(
  nops: NOPApplication[],
  datePrefix: string,
  suffixPrefix: string = ""
): string {
  const pattern = new RegExp(`^SEN/NP/${datePrefix}/${suffixPrefix}(\\d{3})$`);
  const maxSeq = nops.reduce((max, n) => {
    const match = n.id.match(pattern);
    if (!match) return max;
    return Math.max(max, parseInt(match[1], 10));
  }, 0);
  return String(maxSeq + 1).padStart(3, "0");
}

/**
 * SUB-22: Sequential draft sequence number generator in DRAFT-NNN format.
 */
export function generateDraftSequenceNumber(nops: NOPApplication[]): string {
  const pattern = /^DRAFT-(\d{3})$/i;
  const maxSeq = nops.reduce((max, n) => {
    const match = (n.id || "").match(pattern);
    if (!match) return max;
    return Math.max(max, parseInt(match[1], 10));
  }, 0);
  return String(maxSeq + 1).padStart(3, "0");
}

/**
 * NEW-03 & SUB-22: Returns current date formatted as YYYYMMDD in Singapore Standard Time (+08:00)
 */
export function getSgtDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === "year")?.value;
  const month = parts.find(p => p.type === "month")?.value;
  const day = parts.find(p => p.type === "day")?.value;
  return `${year}${month}${day}`;
}

/**
 * NEW-03: Returns an ISO datetime string with SGT offset (+08:00)
 */
export function getSgtIsoString(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00+08:00`;
}

/**
 * FRD §9 UCS Map View: "The UCS map shall provide an NOP layer showing the work
 * locations and boundaries of NOPs with an Active validity state. Suspended,
 * Cancelled, Revoked and Expired NOPs shall not be displayed as active work
 * areas." Upcoming is excluded too — only "Active" qualifies as the inclusion
 * criterion. Only NOPs that actually recorded a work boundary can be plotted.
 */
export function getActiveMapNops(nops: NOPApplication[], now?: Date): NOPApplication[] {
  return nops.filter(
    (n) => n.applicationStatus === "Approved" && derivePermitStatus(n, now) === "Active" && (n.boundaryCoordinates?.length || 0) >= 3
  );
}

export function getUpcomingMapNops(nops: NOPApplication[], now?: Date): NOPApplication[] {
  return nops.filter(
    (n) => n.applicationStatus === "Approved" && derivePermitStatus(n, now) === "Upcoming" && (n.boundaryCoordinates?.length || 0) >= 3
  );
}

export function getSuspendedMapNops(nops: NOPApplication[], now?: Date): NOPApplication[] {
  return nops.filter(
    (n) => n.applicationStatus === "Approved" && (derivePermitStatus(n, now) === "Suspended" || n.permitStatus === "Suspended") && (n.boundaryCoordinates?.length || 0) >= 3
  );
}

/** Sentosa Island's approximate lat/lng bounding box used to project a work
 * boundary's real coordinates onto the stylised SVG island map. */
export const SENTOSA_MAP_BOUNDS = {
  minLat: 1.2440,
  maxLat: 1.2560,
  minLng: 103.8130,
  maxLng: 103.8330
};

export interface SvgViewBox {
  width: number;
  height: number;
}

/** Linear-projects a {lat,lng} boundary point into SVG viewBox coordinates. */
export function projectLatLngToSvg(
  point: { lat: number; lng: number },
  bounds: typeof SENTOSA_MAP_BOUNDS,
  viewBox: SvgViewBox
): { x: number; y: number } {
  const lngSpan = bounds.maxLng - bounds.minLng || 1;
  const latSpan = bounds.maxLat - bounds.minLat || 1;
  const x = ((point.lng - bounds.minLng) / lngSpan) * viewBox.width;
  // Latitude increases northward; SVG y increases downward, so invert.
  const y = viewBox.height - ((point.lat - bounds.minLat) / latSpan) * viewBox.height;
  return { x, y };
}

/** Renders a boundary polygon's points as an SVG `points` attribute string. */
export function boundaryToSvgPoints(
  boundary: { lat: number; lng: number }[],
  bounds: typeof SENTOSA_MAP_BOUNDS,
  viewBox: SvgViewBox
): string {
  return boundary
    .map((p) => {
      const { x, y } = projectLatLngToSvg(p, bounds, viewBox);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function getPermitStatusBadgeProps(status: NOPApplication["permitStatus"]) {
  switch (status) {
    case "Active":
      return {
        label: "Active",
        className: "badge-permit-active",
        dotColor: "#10B981"
      };
    case "Upcoming":
      return {
        label: "Upcoming",
        className: "badge-permit-upcoming",
        dotColor: "#3B82F6"
      };
    case "Suspended":
      return {
        label: "Suspended",
        className: "badge-permit-suspended",
        dotColor: "#EF4444"
      };
    case "Expired":
      return {
        label: "Expired",
        className: "badge-permit-expired",
        dotColor: "#64748B"
      };
    case "Cancelled":
      return {
        label: "Cancelled",
        className: "badge-permit-cancelled",
        dotColor: "#F59E0B"
      };
    case "Revoked":
      return {
        label: "Revoked",
        className: "badge-permit-revoked",
        dotColor: "#E11D48"
      };
    default:
      return {
        label: status,
        className: "badge-permit-expired",
        dotColor: "#64748B"
      };
  }
}

// FRD: Permit Status (Upcoming/Active/Suspended/Expired/Cancelled/Revoked) only exists
// once a NOP has been issued (Application Status = Approved). A Draft, Under Review,
// Change Requested or Withdrawn application must never display an operational permit
// badge (e.g. "Upcoming") — every surface (Register, Portal, detail page, certificate)
// shall show the application's lifecycle stage instead until it is Approved.
export function getEffectiveStatusBadgeProps(nop: Pick<NOPApplication, "applicationStatus" | "permitStatus" | "startDateTime" | "endDateTime">) {
  if (nop.applicationStatus !== "Approved") {
    switch (nop.applicationStatus) {
      case "Draft":
        return { label: "Draft", className: "badge-permit-upcoming", dotColor: "#64748B" };
      case "Under Review":
        return { label: "Under Review", className: "badge-permit-upcoming", dotColor: "#3B82F6" };
      case "Change Requested":
        return { label: "Change Requested", className: "badge-permit-suspended", dotColor: "#F59E0B" };
      case "Withdrawn":
        return { label: "Withdrawn", className: "badge-permit-cancelled", dotColor: "#64748B" };
      default:
        return { label: nop.applicationStatus, className: "badge-permit-upcoming", dotColor: "#64748B" };
    }
  }
  return getPermitStatusBadgeProps(derivePermitStatus(nop));
}

// Single source of truth for "how much Approvals-workspace work does this role
// have pending right now", broken down by which of the workspace's tabs it
// comes from. Both the Sidebar nav badge and the Approvals page banner call
// this SAME function so the two can never drift apart (they used to be two
// separately hand-maintained copies of this filtering logic, which is exactly
// how a prior nop.view_all-leak bug slipped in undetected).
export interface NopApprovalWorkloadBreakdown {
  label: string;
  count: number;
}

export function getNopApprovalWorkload(
  nops: NOPApplication[],
  role: UserRole,
  username?: string
): { loBreakdown: NopApprovalWorkloadBreakdown[]; approverBreakdown: NopApprovalWorkloadBreakdown[]; loPendingCount: number; nopPendingCount: number } {
  // Full-oversight roles (day-to-day NOP administration + the Duty Manager's
  // escalation authority) act across every stage of every workflow. Deliberately
  // narrower than "holds nop.view_all", which pure viewer-tier roles also hold
  // without any actual approval permission — see approvals/page.tsx's identical
  // isOversightRole for the full rationale.
  const isOversightRole = role === "NOP Operations Admin" || role === "Current Ops Administrator";
  const canPrescreenRequests =
    hasNopPermission(role, "nop.prescreen") || hasNopPermission(role, "nop.clear_for_approval") || isOversightRole;
  const canDecideRequests =
    hasNopPermission(role, "nop.endorse_clearance") ||
    hasNopPermission(role, "nop.suspend_permit") ||
    hasNopPermission(role, "nop.lift_suspension") ||
    isOversightRole;
  const canReviewDeferredDocs = hasNopPermission(role, "nop.endorse_clearance") || isOversightRole;

  const loScopedNops =
    role === "Liaison Officer" && !isOversightRole
      ? nops.filter((n) => n.sdcLiaisonOfficer && (n.sdcLiaisonOfficer === username || n.sdcLiaisonOfficer.toLowerCase().includes((username || "").toLowerCase())))
      : nops;

  const approverScopedNops =
    role === "Technical Approver" && !isOversightRole
      ? nops.filter((n) => n.domainApprovals?.some((a) => a.approverName === username || a.approverName?.includes(username || "") || (a.approverGroup && a.approverGroup.toLowerCase().includes((username || "").toLowerCase()))))
      : nops;

  const isLiveApplication = (n: NOPApplication) => n.applicationStatus !== "Draft" && n.applicationStatus !== "Withdrawn";

  const loApplicationPending = loScopedNops.filter(
    (n) =>
      isLiveApplication(n) &&
      n.applicationStatus === "Under Review" &&
      (n.loPreScreenStatus === "Pending Pre-screening" || (!n.loPreScreenStatus && n.applicationStatus === "Under Review"))
  ).length;

  // SEC-03: Scope request pre-screening to assigned LO
  const loRequestPending = canPrescreenRequests
    ? (role === "Liaison Officer" && !isOversightRole ? loScopedNops : nops).filter(
        (n) =>
          (n.extensionRequests || []).some((r) => r.status === "Pending Pre-screening") ||
          n.cancellationRequest?.status === "Pending Pre-screening" ||
          n.liftingRequest?.status === "Pending Pre-screening"
      ).length
    : 0;

  // WF-07: Only Under Review applications that are Cleared for Approval appear in approver pending queue
  const approverClearancePending = approverScopedNops.filter(
    (n) =>
      n.applicationStatus === "Under Review" &&
      n.loPreScreenStatus === "Cleared for Approval" &&
      n.domainApprovals &&
      n.domainApprovals.some((a) =>
        a.status === "Pending" &&
        (isOversightRole || !username || a.approverName === username || a.approverName?.includes(username) || (a.approverGroup && a.approverGroup.toLowerCase().includes(username.toLowerCase())))
      )
  ).length;

  // DOC-04: Deferred document count aligns with reviewer domain
  const deferredDocsPending = canReviewDeferredDocs
    ? (role === "Technical Approver" && !isOversightRole ? approverScopedNops : nops).filter(
        (n) =>
          n.ipaStatus === "Granted" &&
          (n.deferredDocuments || []).some((d) => d.status !== "Accepted")
      ).length
    : 0;

  const requestDecidePending = canDecideRequests
    ? (role === "Technical Approver" && !isOversightRole ? approverScopedNops : nops).filter(
        (n) =>
          (n.extensionRequests || []).some((r) => r.status === "Under Approver Review") ||
          n.cancellationRequest?.status === "Under Approver Review" ||
          (n.liftingRequest ? n.liftingRequest.status === "Under Approver Review" : n.permitStatus === "Suspended")
      ).length
    : 0;

  return {
    loBreakdown: [
      { label: "LO Pre-screening", count: loApplicationPending },
      { label: "Extension/Cancellation/Lifting Requests (Pre-screening)", count: loRequestPending },
    ].filter((part) => part.count > 0),
    approverBreakdown: [
      { label: "Technical Approver Queue", count: approverClearancePending },
      { label: "Deferred Documents Review", count: deferredDocsPending },
      { label: "Extension/Cancellation/Lifting Requests (Final Decision)", count: requestDecidePending },
    ].filter((part) => part.count > 0),
    loPendingCount: loApplicationPending + loRequestPending,
    nopPendingCount: approverClearancePending + deferredDocsPending + requestDecidePending,
  };
}

export const DEFAULT_BLACKOUT_DATES: BlackoutDateConfig[] = [
  {
    id: "BO-2026-001",
    name: "Sentosa GrillFest 2026 (Siloso Beach)",
    startDate: "2026-10-02",
    endDate: "2026-10-18",
    zones: ["Siloso Beach Sector 1", "Siloso Beach Sector 2", "Siloso Point"],
    zoneIds: ["zone-siloso-1", "zone-siloso-2"],
    restrictionLevel: "No Heavy Machinery",
    status: "Scheduled",
  },
  {
    id: "BO-2026-002",
    name: "ZoukOut Singapore 2026 Annual Music Festival",
    startDate: "2026-12-10",
    endDate: "2026-12-14",
    zones: ["Siloso Beach Walk", "Palawan Beach Promenade"],
    zoneIds: ["zone-siloso-1", "zone-palawan-3"],
    restrictionLevel: "Total Blackout",
    status: "Scheduled",
  },
  {
    id: "BO-2026-003",
    name: "Standard Island-Wide Weekend Blackout (BAU Policy)",
    startDate: "Recurring Weekends",
    endDate: "Every Saturday & Sunday",
    zones: ["All Island Precincts"],
    zoneIds: ["zone-island-all"],
    restrictionLevel: "Total Blackout",
    status: "Active",
  },
];

export const INITIAL_NOPS: NOPApplication[] = [
  // 1. DRAFT APPLICATION (Contractor in-progress work)
  {
    id: "DRAFT-001",
    companyName: "Kim Seng Construction Pte Ltd",
    companyUen: "199801234K",
    applicantName: "David Tan",
    creatorUsername: "David Tan",
    creatorEmail: "david.tan@kimseng.sg",
    applicantPhone: "+65 9123 4567",
    applicantEmail: "david.tan@kimseng.sg",
    workDescription: "Siloso Walkway Solar Canopy Maintenance & Glazing Sealant Replacement",
    durationCategory: "BAU Maintenance",
    projectTitle: "Siloso Beach Walkway Solar Canopy Maintenance",
    location: "Siloso Beach Walkway Canopy Area",
    zone: "Sector 1 (North Siloso)",
    roadName: "Siloso Beach Walk",
    buildingCommonName: "Siloso Canopy Pavilions",
    postalCode: "099981",
    level: "Ground Level / Walkway",
    unitRoomNumber: "SC-P01",
    spaceDescription: "Siloso Walkway solar canopy and overhead glazing framing zone",
    locationTags: ["Promenade", "Beachfront"],
    boundaryCoordinates: [
      { lat: 1.2505, lng: 103.8180 },
      { lat: 1.2515, lng: 103.8192 },
      { lat: 1.2508, lng: 103.8200 },
      { lat: 1.2498, lng: 103.8188 }
    ],
    startDateTime: "2026-10-08T08:00:00Z",
    endDateTime: "2026-10-15T18:00:00Z",
    workingHours: "08:00 – 18:00 (Daily)",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Draft",
    permitStatus: "Upcoming",
    ipaStatus: "N/A",
    documentCompletion: "Documents Outstanding",
    triggers: [
      "Working at Height Above 30 Metres",
      "Works requiring more than 1 hour at a single SDC-managed location, excluding Island Partner premises, Sentosa Golf Club and Sentosa Cove"
    ],
    documents: [
      { id: "d1", name: "Draft Safe Work Method Statement", type: "PDF", status: "Under Review", uploadedAt: "2026-09-18", fileSize: "1.8 MB" }
    ],
    workers: [
      { id: "w1", name: "David Tan", role: "Site Supervisor", idNumber: "S****123A", passType: "Work Permit", verified: true }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Pending Pre-screening",
    domainApprovals: [],
    submittedAt: "Saved as Draft on 2026-09-21 09:30"
  },

  // 2. LO PRE-SCREENING: PENDING PRE-SCREENING (Freshly submitted by Contractor)
  {
    id: "SEN/NP/20260921/002",
    companyName: "Kim Seng Construction Pte Ltd",
    companyUen: "199801234K",
    applicantName: "David Tan",
    applicantPhone: "+65 9123 4567",
    applicantEmail: "david.tan@kimseng.sg",
    workDescription: "Siloso Pavilions Roof Membrane Waterproofing & Sealing",
    durationCategory: "BAU Maintenance",
    location: "Siloso Beach Pavilions",
    zone: "Siloso Sector 1",
    boundaryCoordinates: [
      { lat: 1.2482, lng: 103.8145 },
      { lat: 1.2492, lng: 103.8158 },
      { lat: 1.2485, lng: 103.8165 },
      { lat: 1.2475, lng: 103.8152 }
    ],
    startDateTime: "2026-10-05T08:00:00Z",
    endDateTime: "2026-10-12T18:00:00Z",
    workingHours: "08:00 – 18:00 (Daily)",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Under Review",
    permitStatus: "Upcoming",
    ipaStatus: "Pending",
    documentCompletion: "Documents Outstanding",
    triggers: [
      "Working at Height Above 30 Metres",
      "Works requiring more than 1 hour at a single SDC-managed location, excluding Island Partner premises, Sentosa Golf Club and Sentosa Cove"
    ],
    documents: [
      { id: "d1", name: "Risk Assessment Form (RA)", type: "PDF", status: "Pending Review", uploadedAt: "2026-09-21", fileSize: "2.1 MB" },
      { id: "d2", name: "Method Statement incl. Scope of Works (MOS)", type: "PDF", status: "Pending Review", uploadedAt: "2026-09-21", fileSize: "3.4 MB" },
      { id: "d3", name: "Location Plan & Site Layout (LOC)", type: "PDF", status: "Pending Review", uploadedAt: "2026-09-21", fileSize: "1.8 MB" }
    ],
    workers: [
      { id: "w1", name: "David Tan", role: "Site Supervisor", idNumber: "S****123A", passType: "Work Permit", verified: false }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Pending Pre-screening",
    domainApprovals: [],
    submittedAt: "2026-09-21 11:15"
  },

  // 3. LO PRE-SCREENING: CHANGE REQUESTED BY LIAISON OFFICER
  {
    id: "SEN/NP/20260920/003",
    companyName: "Kim Seng Construction Pte Ltd",
    companyUen: "199801234K",
    applicantName: "David Tan (Project Manager)",
    applicantPhone: "+65 9123 4567",
    applicantEmail: "david.tan@kimseng.sg",
    workDescription: "Tanjong Beach Promenade Streetlamp Replacement & Trenching",
    durationCategory: "Ad-hoc Work",
    location: "Tanjong Beach Promenade",
    zone: "Tanjong Beach",
    startDateTime: "2026-10-01T08:00:00Z",
    endDateTime: "2026-10-10T18:00:00Z",
    workingHours: "08:00 – 18:00 (Daily)",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Change Requested",
    permitStatus: "Upcoming",
    ipaStatus: "Pending",
    documentCompletion: "Documents Outstanding",
    triggers: [
      "Works requiring more than 1 hour at a single SDC-managed location, excluding Island Partner premises, Sentosa Golf Club and Sentosa Cove",
      "High-Risk Work, Equipment and Vehicles"
    ],
    documents: [
      { id: "d1", name: "Risk Assessment Form (RA)", type: "PDF", status: "Under Review", uploadedAt: "2026-09-20", fileSize: "1.9 MB" }
    ],
    workers: [
      { id: "w1", name: "David Tan", role: "Site Supervisor", idNumber: "S****123A", passType: "Work Permit", verified: false }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Change Requested",
    loComments: "Missing certified electrical worker licence (LEW endorsement) and public liability insurance schedule.",
    domainApprovals: [],
    submittedAt: "2026-09-20 14:00"
  },

  // 4. LO CLEARED -> TECHNICAL APPROVERS UNDER REVIEW
  {
    id: "SEN/NP/20260919/004",
    companyName: "GreenScape Arboriculture Pte Ltd",
    companyUen: "201529876C",
    applicantName: "Lim Wei Ling (Certified Arborist)",
    applicantPhone: "+65 9234 5678",
    applicantEmail: "lim.weiling@greenscape.sg",
    workDescription: "Hazard Tree Felling Near Sentosa Express Track Protection Zone",
    durationCategory: "Ad-hoc Work",
    location: "Sentosa Express Track Protection Corridor",
    zone: "Waterfront - Imbiah",
    boundaryCoordinates: [
      { lat: 1.2498, lng: 103.8210 },
      { lat: 1.2510, lng: 103.8225 },
      { lat: 1.2502, lng: 103.8232 },
      { lat: 1.2490, lng: 103.8217 }
    ],
    startDateTime: "2026-09-28T01:00:00Z",
    endDateTime: "2026-09-30T04:30:00Z",
    workingHours: "01:00 – 04:30 (Non-Revenue Rail Window)",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Under Review",
    permitStatus: "Upcoming",
    ipaStatus: "Pending",
    documentCompletion: "Documents Outstanding",
    triggers: [
      "Works within 6 metres of Sentosa Express Track protection zone",
      "Removal of trees with a girth exceeding 1 metre",
      "High-Risk Work, Equipment and Vehicles"
    ],
    documents: [
      { id: "d1", name: "Certified Arborist Risk Assessment & Tree Health Report", type: "PDF", status: "Verified", uploadedAt: "2026-09-19", fileSize: "5.2 MB" },
      { id: "d2", name: "Track Possession & Traction Power Isolation Protocol", type: "PDF", status: "Under Review", uploadedAt: "2026-09-19", fileSize: "2.8 MB" }
    ],
    workers: [
      { id: "w1", name: "Lim Wei Ling", role: "Certified Arborist", idNumber: "S****551H", passType: "ISA Certified", verified: false },
      { id: "w2", name: "Mohamad Noor", role: "Tree Climber Specialist", idNumber: "G****112J", passType: "Work Permit", verified: false }
    ],
    sdcLiaisonOfficer: "Jonathan Teo (Liaison Officer, Sentosa Express)",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      { domain: "Sentosa Express Rail Operations", approverName: "Tan Kian Seng", approverRole: "General Manager (Sentosa Express)", departmentId: "express", status: "Pending", comments: "Awaiting midnight traction isolation engineering sign-off.", pendingSince: "2026-09-19T14:00:00.000Z" },
      { domain: "Arborist & Island Landscaping", approverName: "Audrey Seah", approverRole: "Lead Arborist (Landscape & Tree Conservation)", departmentId: "landscape", status: "Approved", decidedAt: "2026-09-19 16:15", comments: "Felling procedure approved for mature Albizia Tree T-14." },
      { domain: "WSH Safety & Operations", approverName: "Wong Siew Leng", approverRole: "Head (Workplace Safety & Health)", departmentId: "wsh", status: "Pending", pendingSince: "2026-09-19T14:00:00.000Z" }
    ],
    submittedAt: "2026-09-19 10:00"
  },

  // 5. TECHNICAL APPROVER CHANGE REQUESTED (Specialist PE requested revisions)
  {
    id: "SEN/NP/20260918/005",
    companyName: "Kim Seng Construction Pte Ltd",
    companyUen: "199801234K",
    applicantName: "David Tan (Project Manager)",
    applicantPhone: "+65 9123 4567",
    applicantEmail: "david.tan@kimseng.sg",
    workDescription: "Siloso Walkway Heavy Canopy Truss Replacement",
    durationCategory: "Ad-hoc Work",
    location: "Siloso Beach Walkway",
    zone: "Siloso Sector 1",
    boundaryCoordinates: [
      { lat: 1.2495, lng: 103.8162 },
      { lat: 1.2505, lng: 103.8175 },
      { lat: 1.2498, lng: 103.8182 },
      { lat: 1.2488, lng: 103.8169 }
    ],
    startDateTime: "2026-10-01T08:00:00Z",
    endDateTime: "2026-10-15T18:00:00Z",
    workingHours: "08:00 – 18:00 (Daily)",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Change Requested",
    permitStatus: "Upcoming",
    ipaStatus: "Pending",
    documentCompletion: "Documents Outstanding",
    triggers: [
      "Working at Height Above 30 Metres",
      "High-Risk Work, Equipment and Vehicles",
      "Works requiring more than 1 hour at a single SDC-managed location, excluding Island Partner premises, Sentosa Golf Club and Sentosa Cove"
    ],
    documents: [
      { id: "d1", name: "Safe Work Procedure & Method Statement", type: "PDF", status: "Verified", uploadedAt: "2026-09-18", fileSize: "2.8 MB" },
      { id: "d2", name: "Truss Anchor Bolt PE Calculation (Rev 1)", type: "PDF", status: "Under Review", uploadedAt: "2026-09-18", fileSize: "1.4 MB" }
    ],
    workers: [
      { id: "w1", name: "David Tan", role: "Site Supervisor", idNumber: "S****123A", passType: "Work Permit", verified: false },
      { id: "w2", name: "Zaw Win", role: "Rigger Lead", idNumber: "G****789C", passType: "Work Permit", verified: false }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      {
        domain: "C&S PE Structural Review Panel",
        approverName: "Er. Ng Beng Hock",
        approverRole: "Principal Civil & Structural PE",
        departmentId: "structural",
        status: "Change Requested",
        decidedAt: "2026-09-18 16:30",
        comments: "Anchor bolt tensile calculations missing wind suction loads. Please provide revised PE calculation Rev 2 and updated certified welder list."
      },
      {
        domain: "WSH Safety & Operations Oversight Group",
        approverName: "Wong Siew Leng",
        approverRole: "Head (Workplace Safety & Health)",
        departmentId: "wsh",
        status: "Pending",
        comments: "Pending structural PE clearance."
      }
    ],
    submittedAt: "2026-09-18 09:00"
  },

  // 6. APPLICATION WITHDRAWN BY CONTRACTOR
  {
    id: "SEN/NP/20260917/006",
    companyName: "Kim Seng Construction Pte Ltd",
    companyUen: "199801234K",
    applicantName: "David Tan (Project Manager)",
    applicantPhone: "+65 9123 4567",
    applicantEmail: "david.tan@kimseng.sg",
    workDescription: "Temporary Seafront Acoustic Barrier Installation for Festival",
    durationCategory: "Ad-hoc Work",
    location: "Siloso Beach Frontage",
    zone: "Siloso Sector 2",
    startDateTime: "2026-10-15T08:00:00Z",
    endDateTime: "2026-10-20T18:00:00Z",
    workingHours: "08:00 – 18:00 (Daily)",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Withdrawn",
    permitStatus: "Upcoming",
    ipaStatus: "N/A",
    documentCompletion: "Documents Outstanding",
    triggers: [
      "Temporary Works Along the Seafront",
      "Works requiring more than 1 hour at a single SDC-managed location, excluding Island Partner premises, Sentosa Golf Club and Sentosa Cove"
    ],
    documents: [
      { id: "d1", name: "Initial Method Statement Draft", type: "PDF", status: "Under Review", uploadedAt: "2026-09-17", fileSize: "1.1 MB" }
    ],
    workers: [
      { id: "w1", name: "David Tan", role: "Site Supervisor", idNumber: "S****123A", passType: "Work Permit", verified: false }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Pending Pre-screening",
    domainApprovals: [],
    submittedAt: "2026-09-17 11:00"
  },

  // 7. CLEARANCE GATE: URGENT IPA GRANTED + OVERDUE DEFERRED DOCUMENTS
  {
    id: "SEN/NP/20260916/007",
    companyName: "SenTech Utilities Pte Ltd",
    companyUen: "201015678W",
    applicantName: "Ahmad Razif (Infrastructure Manager)",
    applicantPhone: "+65 9345 6789",
    applicantEmail: "ahmad.razif@sentech.com.sg",
    workDescription: "66kV Substation Deep Trench Excavation",
    durationCategory: "Project Work",
    location: "Siloso Road & Artillery Ave",
    zone: "Siloso Point",
    boundaryCoordinates: [
      { lat: 1.2532, lng: 103.8158 },
      { lat: 1.2538, lng: 103.8166 },
      { lat: 1.2530, lng: 103.8172 },
      { lat: 1.2524, lng: 103.8163 }
    ],
    startDateTime: "2026-09-16T08:00:00Z",
    endDateTime: "2026-10-15T18:00:00Z",
    workingHours: "08:00 – 18:00 (Daily)",
    isUrgent: true,
    hasBlackoutOverlap: false,
    excavationDepth: "7.5m",
    applicationStatus: "Approved",
    permitStatus: "Active",
    ipaStatus: "Granted",
    ipaAuthorisedPeriod: "16 Sep 2026 08:00 – 19 Sep 2026 18:00 (Limited to exploratory trenching only)",
    ipaConditions: "Excavation exceeding 1.5m depth strictly prohibited until PE settlement instrumentation plan is verified.",
    documentCompletion: "Overdue",
    documentDeadline: "2026-09-19T18:00:00.000Z",
    deferredDocuments: [
      {
        id: "def-1",
        name: "Soil Settlement & Inclinometer Instrumentation Plan",
        requiredForTrigger: "Excavation Work",
        status: "Under Review",
        fileUrl: "SenTech_Soil_Settlement_Monitoring_Plan_v1.pdf",
        uploadedAt: "2026-09-18",
        reviewerComments: ""
      },
      {
        id: "def-2",
        name: "Geotechnical PE Calculation Endorsement",
        requiredForTrigger: "Excavation Work (Depth > 6.0m)",
        status: "Pending Submission",
        reviewerComments: ""
      }
    ],
    triggers: [
      "Excavation Work",
      "High-Risk Work, Equipment and Vehicles"
    ],
    documents: [
      { id: "d1", name: "Safe Work Procedure & Risk Assessment", type: "PDF", status: "Verified", uploadedAt: "2026-09-16", fileSize: "3.7 MB" },
      { id: "d2", name: "Soil Settlement & Inclinometer Instrumentation Plan", type: "PDF", status: "Under Review", requiredBy: "19 Sep 2026", isDeferred: true, uploadedAt: "2026-09-18", fileSize: "3.2 MB", fileUrl: "SenTech_Soil_Settlement_Monitoring_Plan_v1.pdf" },
      { id: "d3", name: "Geotechnical PE Calculation Endorsement", type: "PDF", status: "Overdue", requiredBy: "19 Sep 2026", isDeferred: true, fileSize: "Pending Filing" }
    ],
    workers: [
      { id: "w1", name: "Ahmad Razif", role: "Project Lead", idNumber: "S****882C", passType: "Staff ID", verified: false }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      { domain: "Geotechnical & Utilities Protection Team", approverName: "Er. Dr. Goh Teck Soon", approverRole: "Geotechnical Specialist PE", departmentId: "geotechnical", status: "Approved", decidedAt: "2026-09-16 17:00", comments: "Conditional IPA granted. Deep excavation prohibited until PE settlement report is filed." },
      { domain: "SDC Central Operations Group", approverName: "Daniel Lim", approverRole: "Director (Island Operations)", departmentId: "ops", status: "Approved", decidedAt: "2026-09-16 17:30", comments: "Urgent IPA authorized. Documents deadline set to continuous 3 calendar days." }
    ],
    submittedAt: "2026-09-16 16:45"
  },

  // 8. CLEARANCE GATE: URGENT IPA GRANTED + DEFERRED DOCUMENTS COMPLETE
  {
    id: "SEN/NP/20260915/008",
    companyName: "SenTech Utilities Pte Ltd",
    companyUen: "201015678W",
    applicantName: "Ahmad Razif (Infrastructure Manager)",
    applicantPhone: "+65 9345 6789",
    applicantEmail: "ahmad.razif@sentech.com.sg",
    workDescription: "Urgent Drainage Culvert Trenching & Siphon Chamber Installation",
    durationCategory: "Ad-hoc Work",
    location: "Artillery Ave Drainage Reserve",
    zone: "Siloso Point",
    startDateTime: "2026-09-15T08:00:00Z",
    endDateTime: "2026-10-15T18:00:00Z",
    workingHours: "08:00 – 18:00 (Daily)",
    isUrgent: true,
    hasBlackoutOverlap: false,
    applicationStatus: "Approved",
    permitStatus: "Active",
    ipaStatus: "Granted",
    documentCompletion: "Documents Complete",
    deferredDocuments: [
      {
        id: "def-1",
        name: "Soil Settlement & Inclinometer Instrumentation Plan",
        requiredForTrigger: "Excavation Work",
        status: "Accepted",
        fileUrl: "SenTech_Culvert_Instrumentation_Plan_Endorsed.pdf",
        uploadedAt: "2026-09-17",
        reviewedBy: "Er. Dr. Goh Teck Soon",
        reviewedAt: "2026-09-18 10:00"
      }
    ],
    triggers: [
      "Excavation Work",
      "High-Risk Work, Equipment and Vehicles"
    ],
    documents: [
      { id: "d1", name: "Safe Work Procedure & Risk Assessment", type: "PDF", status: "Verified", uploadedAt: "2026-09-15", fileSize: "2.9 MB" },
      { id: "d2", name: "Soil Settlement Instrumentation Plan (Accepted)", type: "PDF", status: "Verified", uploadedAt: "2026-09-17", fileSize: "4.1 MB" },
      { id: "d3", name: "Location Plan & Site Layout (LOC)", type: "PDF", status: "Verified", uploadedAt: "2026-09-15", fileSize: "1.9 MB" }
    ],
    workers: [
      { id: "w1", name: "Ahmad Razif", role: "Project Lead", idNumber: "S****882C", passType: "Staff ID", verified: true }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      { domain: "Geotechnical & Utilities Protection Team", approverName: "Er. Dr. Goh Teck Soon", approverRole: "Geotechnical Specialist PE", departmentId: "geotechnical", status: "Approved", decidedAt: "2026-09-15 11:00", comments: "IPA and deferred calculations endorsed." }
    ],
    submittedAt: "2026-09-15 08:30"
  },

  // 9. PERMIT STATUS: ACTIVE (Standard Full Approval & Audited)
  {
    id: "SEN/NP/20260914/009",
    companyName: "Kim Seng Construction Pte Ltd",
    companyUen: "199801234K",
    applicantName: "David Tan",
    applicantPhone: "+65 9123 4567",
    applicantEmail: "david.tan@kimseng.sg",
    workDescription: "Palawan Boardwalk Timber Shoring & Structural Renewal",
    durationCategory: "Project Work",
    location: "Palawan Beach Boardwalk",
    zone: "Sector 2 (South Beach)",
    boundaryCoordinates: [
      { lat: 1.2468, lng: 103.8218 },
      { lat: 1.2472, lng: 103.8228 },
      { lat: 1.2465, lng: 103.8233 },
      { lat: 1.2461, lng: 103.8222 }
    ],
    startDateTime: "2026-09-20T08:00:00Z",
    endDateTime: "2026-10-31T18:00:00Z",
    workingHours: "08:00 – 18:00 (Daily)",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Approved",
    permitStatus: "Active",
    ipaStatus: "N/A",
    documentCompletion: "Documents Complete",
    triggers: [
      "Working at Height Above 30 Metres",
      "Temporary Works Along the Seafront",
      "High-Risk Work, Equipment and Vehicles"
    ],
    documents: [
      { id: "d1", name: "Risk Assessment Form (RA-2026-0941)", type: "PDF", status: "Verified", uploadedAt: "2026-09-10", fileSize: "2.4 MB" },
      { id: "d2", name: "Method Statement, including Scope of Works (MOS-V2)", type: "PDF", status: "Verified", uploadedAt: "2026-09-10", fileSize: "4.1 MB" },
      { id: "d3", name: "PE-Endorsed Scaffolding Calculation", type: "PDF", status: "Verified", uploadedAt: "2026-09-10", fileSize: "5.8 MB" },
      { id: "d4", name: "Location Plan & Site Layout (LOC)", type: "PDF", status: "Verified", uploadedAt: "2026-09-10", fileSize: "2.1 MB" }
    ],
    workers: [
      { id: "w1", name: "Tan Ah Beng", role: "Site Supervisor / PIC", idNumber: "S****123A", passType: "Work Permit", verified: true },
      { id: "w2", name: "Kumar Rajan", role: "Certified Scaffolder", idNumber: "G****456B", passType: "MOM Scaffolding Cert", verified: true }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      { domain: "C&S PE Structural Review Panel", approverName: "Er. Ng Beng Hock", approverRole: "Principal Civil & Structural PE", departmentId: "structural", status: "Approved", decidedAt: "2026-09-14 10:30", comments: "Lateral load & tidal checks cleared." },
      { domain: "WSH Safety & Operations Oversight Group", approverName: "Wong Siew Leng", approverRole: "Head (Workplace Safety & Health)", departmentId: "wsh", status: "Approved", decidedAt: "2026-09-14 11:00", comments: "Safety barriers and harnesses verified." }
    ],
    submittedAt: "2026-09-10 14:20",
    lastAudit: {
      auditedBy: "Ranger Unit 04 (Tan Wei Ming)",
      auditedAt: "2026-09-17 09:15",
      complianceScore: "100% Compliant",
      notes: "All workers badged and equipped with harness/helmets. Spatial boundary matches permit footprint."
    }
  },

  // 10. PERMIT STATUS: UPCOMING (Approved, valid for future execution dates)
  {
    id: "SEN/NP/20260913/010",
    companyName: "Huationg Contractor Pte Ltd",
    companyUen: "200204321M",
    applicantName: "Kenneth Low (Civil Construction Lead)",
    applicantPhone: "+65 8123 9988",
    applicantEmail: "kenneth.low@huationg.com.sg",
    workDescription: "Sentosa Gateway Inbound Lane 2 Heavy Resurfacing & Line Marking",
    durationCategory: "Ad-hoc Work",
    location: "Sentosa Gateway Inbound Arterial Road",
    zone: "Gateway Corridor",
    boundaryCoordinates: [
      { lat: 1.2542, lng: 103.8245 },
      { lat: 1.2555, lng: 103.8265 },
      { lat: 1.2548, lng: 103.8272 },
      { lat: 1.2535, lng: 103.8252 }
    ],
    startDateTime: "2026-10-10T23:00:00Z",
    endDateTime: "2026-10-20T05:00:00Z",
    workingHours: "23:00 – 05:00 (Night Works)",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Approved",
    permitStatus: "Upcoming",
    ipaStatus: "N/A",
    documentCompletion: "Documents Complete",
    triggers: [
      "Works requiring partial or full closure of a lane or road (TMP Mandatory)",
      "High-Risk Work, Equipment and Vehicles"
    ],
    documents: [
      { id: "d1", name: "Traffic Management Plan (TMP)", type: "PDF", status: "Verified", uploadedAt: "2026-09-13", fileSize: "8.4 MB" },
      { id: "d2", name: "Night Work Noise Mitigation Plan", type: "PDF", status: "Verified", uploadedAt: "2026-09-13", fileSize: "2.1 MB" }
    ],
    workers: [
      { id: "w1", name: "Kenneth Low", role: "Paving Superintendent", idNumber: "S****441D", passType: "Supervisor", verified: true }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      { domain: "Traffic Management & Safety Committee", approverName: "Mohd Firdaus", approverRole: "Senior Manager (Traffic & Road Safety)", departmentId: "traffic", status: "Approved", decidedAt: "2026-09-14 10:00", comments: "Traffic diversion schedule approved." },
      { domain: "SDC Central Operations Group", approverName: "Daniel Lim", approverRole: "Director (Island Operations)", departmentId: "ops", status: "Approved", decidedAt: "2026-09-14 11:30" }
    ],
    submittedAt: "2026-09-13 09:00"
  },

  // 11. PERMIT STATUS: SUSPENDED (Safety Stop-Work Order Issued + Lifting Request in Progress)
  {
    id: "SEN/NP/20260912/011",
    companyName: "Oceanic Marine Works Pte Ltd",
    companyUen: "200711223R",
    applicantName: "Michael Wee (Marine Works Supervisor)",
    applicantPhone: "+65 9887 6655",
    applicantEmail: "michael.wee@oceanicmarine.sg",
    workDescription: "Underwater Jetty Pile Corrosion Repair & Cathodic Anode Fitting",
    durationCategory: "Project Work",
    location: "Sentosa Cove Jetty B",
    zone: "Sentosa Cove",
    boundaryCoordinates: [
      { lat: 1.2465, lng: 103.8290 },
      { lat: 1.2475, lng: 103.8310 },
      { lat: 1.2460, lng: 103.8320 },
      { lat: 1.2450, lng: 103.8300 }
    ],
    startDateTime: "2026-09-10T08:00:00Z",
    endDateTime: "2026-09-30T18:00:00Z",
    workingHours: "08:00 – 18:00 (Daily)",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Approved",
    permitStatus: "Suspended",
    ipaStatus: "N/A",
    documentCompletion: "Documents Complete",
    suspensionDetails: {
      reason: "Diver certification found expired during routine field audit.",
      suspendedAt: "2026-09-08 17:00",
      suspendedBy: "Wong Siew Leng (Head, Workplace Safety & Health)"
    },
    liftingRequest: {
      requestedAt: "2026-09-20 09:00",
      reason: "All 3 commercial divers have renewed their diving certifications; valid certs uploaded for audit clearance.",
      status: "Pending Pre-screening",
      requestedBy: "Michael Wee (Marine Works Supervisor)"
    },
    triggers: [
      "Temporary Works Along the Seafront",
      "High-Risk Work, Equipment and Vehicles"
    ],
    documents: [
      { id: "d1", name: "Safe Work Procedure & Diving Operations Plan", type: "PDF", status: "Verified", uploadedAt: "2026-09-08", fileSize: "3.1 MB" },
      { id: "d2", name: "Commercial Diving Certification (Renewed)", type: "PDF", status: "Verified", uploadedAt: "2026-09-20", fileSize: "1.2 MB" }
    ],
    workers: [
      { id: "w1", name: "Michael Wee", role: "Marine Works Supervisor", idNumber: "S****221F", passType: "Work Permit", verified: true },
      { id: "w2", name: "Rizal Hamid", role: "Commercial Diver", idNumber: "G****774H", passType: "MOM Diving Cert", verified: true }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      { domain: "Coastal & Maritime Engineering Group", approverName: "Capt. David Koh", approverRole: "Principal Coastal & Marine Specialist", departmentId: "marine", status: "Approved", decidedAt: "2026-09-08 15:00" },
      { domain: "WSH Safety & Operations Oversight Group", approverName: "Wong Siew Leng", approverRole: "Head (Workplace Safety & Health)", departmentId: "wsh", status: "Approved", decidedAt: "2026-09-08 16:30" }
    ],
    submittedAt: "2026-09-05 10:00"
  },

  // 12. PERMIT STATUS: EXPIRED (Past validity end date)
  {
    id: "SEN/NP/20260820/012",
    companyName: "GreenScape Arboriculture Pte Ltd",
    companyUen: "201529876C",
    applicantName: "Lim Wei Ling (Certified Arborist)",
    applicantPhone: "+65 9234 5678",
    applicantEmail: "lim.weiling@greenscape.sg",
    workDescription: "Imbiah Hill Earthworks & Slope Soil Bioengineering Stabilization",
    durationCategory: "BAU Maintenance",
    location: "Imbiah Hill Slope Sector B",
    zone: "Imbiah Hill",
    startDateTime: "2026-08-22T08:00:00Z",
    endDateTime: "2026-09-05T18:00:00Z",
    workingHours: "08:00 – 18:00 (Daily)",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Approved",
    permitStatus: "Expired",
    ipaStatus: "N/A",
    documentCompletion: "Documents Complete",
    triggers: [
      "Vegetation removal or earthworks covering > 2,000 sqm",
      "High-Risk Work, Equipment and Vehicles"
    ],
    documents: [
      { id: "d1", name: "Environmental Management Plan (EMMP)", type: "PDF", status: "Verified", uploadedAt: "2026-08-20", fileSize: "4.5 MB" }
    ],
    workers: [
      { id: "w1", name: "Lim Wei Ling", role: "Arborist", idNumber: "S****551H", passType: "ISA Certified", verified: true }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      { domain: "Landscape & Environmental Directorate", approverName: "Audrey Seah", approverRole: "Head (Landscape & Ecology)", departmentId: "landscape", status: "Approved", decidedAt: "2026-08-21 11:00" }
    ],
    submittedAt: "2026-08-20 10:00"
  },

  // 13. PERMIT STATUS: CANCELLED (Voluntary Permit Cancellation Approved)
  {
    id: "SEN/NP/20260905/013",
    companyName: "Mount Faber Leisure Group Pte Ltd",
    companyUen: "197400567E",
    applicantName: "Steve Lim (Station Operations Lead)",
    applicantPhone: "+65 9876 5432",
    applicantEmail: "steve.lim@mountfaber.sg",
    workDescription: "Cableway Tower 3 Sensor & Overhaul (Cancelled)",
    durationCategory: "BAU Maintenance",
    location: "Imbiah Tower 3 Enclosure",
    zone: "Imbiah Hill",
    startDateTime: "2026-09-10T09:00:00Z",
    endDateTime: "2026-09-20T17:00:00Z",
    workingHours: "09:00 – 17:00 (Daily)",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Approved",
    permitStatus: "Cancelled",
    ipaStatus: "N/A",
    documentCompletion: "Documents Complete",
    cancellationRequest: {
      requestedAt: "2026-09-12 09:30",
      reason: "Cableway operator rescheduled overhaul to next maintenance cycle.",
      status: "Approved",
      comments: "Cancellation confirmed and access keys returned.",
      requestedBy: "Steve Lim (Station Operations Lead)"
    },
    triggers: [
      "Works within 7.5 metres of Sentosa Intra Island Cableway protection zone",
      "High-Risk Work, Equipment and Vehicles"
    ],
    documents: [
      { id: "d1", name: "Cableway Safety Protocol", type: "PDF", status: "Verified", uploadedAt: "2026-09-04", fileSize: "1.9 MB" }
    ],
    workers: [
      { id: "w1", name: "Steve Lim", role: "Station Lead", idNumber: "S****221K", passType: "Staff ID", verified: true }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      { domain: "Mount Faber Ropeway Safety Team", approverName: "Lim Chee Meng", approverRole: "Lead Ropeway Safety Engineer", departmentId: "cableway", status: "Approved", decidedAt: "2026-09-06 11:20" }
    ],
    submittedAt: "2026-09-05 10:00"
  },

  // 14. PERMIT STATUS: REVOKED (Revoked for Critical Non-Compliance)
  {
    id: "SEN/NP/20260901/014",
    companyName: "SenTech Utilities Pte Ltd",
    companyUen: "201015678W",
    applicantName: "Ahmad Razif (Infrastructure Manager)",
    applicantPhone: "+65 9345 6789",
    applicantEmail: "ahmad.razif@sentech.com.sg",
    workDescription: "Deep Ground Anchor Drill Work without Verified Utility Clearances",
    durationCategory: "Project Work",
    location: "Gateway Underground Utility Trench",
    zone: "Gateway Corridor",
    startDateTime: "2026-09-05T08:00:00Z",
    endDateTime: "2026-09-25T18:00:00Z",
    workingHours: "08:00 – 18:00 (Daily)",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Approved",
    permitStatus: "Revoked",
    ipaStatus: "N/A",
    documentCompletion: "Documents Complete",
    suspensionDetails: {
      suspendedAt: "2026-09-08 15:00",
      suspendedBy: "Daniel Lim (Director, Island Operations)",
      reason: "Critical breach: Unauthorized heavy excavator drilling within 1 metre of 66kV SP PowerGrid feeder line without pilot trench verification."
    },
    triggers: [
      "Excavation Work",
      "High-Risk Work, Equipment and Vehicles"
    ],
    documents: [
      { id: "d1", name: "Safe Work Procedure Draft", type: "PDF", status: "Verified", uploadedAt: "2026-09-01", fileSize: "3.2 MB" }
    ],
    workers: [
      { id: "w1", name: "Ahmad Razif", role: "Project Lead", idNumber: "S****882C", passType: "Staff ID", verified: true }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      { domain: "Geotechnical & Utilities Protection Team", approverName: "Er. Dr. Goh Teck Soon", approverRole: "Geotechnical Specialist PE", departmentId: "geotechnical", status: "Approved", decidedAt: "2026-09-02 10:00" }
    ],
    submittedAt: "2026-09-01 09:00"
  },

  // 15. PERMIT STATUS: UPCOMING (Kim Seng Construction - Approved Upcoming)
  {
    id: "SEN/NP/20260923/015",
    companyName: "Kim Seng Construction Pte Ltd",
    companyUen: "199801234K",
    applicantName: "David Tan (Project Manager)",
    applicantPhone: "+65 9123 4567",
    applicantEmail: "david.tan@kimseng.sg",
    workDescription: "Siloso Beach Walkway Phase 2 Canopy Extension",
    durationCategory: "Project Work",
    location: "Siloso Beach Walkway",
    zone: "Sector 1 (North Siloso)",
    boundaryCoordinates: [
      { lat: 1.2510, lng: 103.8185 },
      { lat: 1.2520, lng: 103.8195 },
      { lat: 1.2515, lng: 103.8205 },
      { lat: 1.2505, lng: 103.8195 }
    ],
    startDateTime: "2026-10-15T08:00:00Z",
    endDateTime: "2026-10-30T18:00:00Z",
    workingHours: "08:00 – 18:00 (Daily)",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Approved",
    permitStatus: "Upcoming",
    ipaStatus: "N/A",
    documentCompletion: "Documents Complete",
    triggers: [
      "Working at Height Above 30 Metres",
      "High-Risk Work, Equipment and Vehicles"
    ],
    documents: [
      { id: "d1", name: "Risk Assessment Plan", type: "PDF", status: "Verified", uploadedAt: "2026-09-23", fileSize: "2.1 MB" },
      { id: "d2", name: "Method Statement", type: "PDF", status: "Verified", uploadedAt: "2026-09-23", fileSize: "3.5 MB" }
    ],
    workers: [
      { id: "w1", name: "David Tan", role: "Site Supervisor", idNumber: "S****123A", passType: "Work Permit", verified: true }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      { domain: "WSH Safety & Operations Oversight Group", approverName: "Wong Siew Leng", approverRole: "Head (Workplace Safety & Health)", departmentId: "wsh", status: "Approved", decidedAt: "2026-09-24 10:00" }
    ],
    submittedAt: "2026-09-23 09:30"
  },

  // 16. PERMIT STATUS: SUSPENDED (Kim Seng Construction - Stop-Work Order Issued)
  {
    id: "SEN/NP/20260922/016",
    companyName: "Kim Seng Construction Pte Ltd",
    companyUen: "199801234K",
    applicantName: "David Tan (Project Manager)",
    applicantPhone: "+65 9123 4567",
    applicantEmail: "david.tan@kimseng.sg",
    workDescription: "Palawan Beach Timber Decking & Structural Reinforcement",
    durationCategory: "Project Work",
    location: "Palawan Beach Timber Deck",
    zone: "Sector 2 (South Beach)",
    boundaryCoordinates: [
      { lat: 1.2460, lng: 103.8210 },
      { lat: 1.2470, lng: 103.8220 },
      { lat: 1.2465, lng: 103.8225 },
      { lat: 1.2455, lng: 103.8215 }
    ],
    startDateTime: "2026-09-15T08:00:00Z",
    endDateTime: "2026-10-25T18:00:00Z",
    workingHours: "08:00 – 18:00 (Daily)",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Approved",
    permitStatus: "Suspended",
    ipaStatus: "N/A",
    documentCompletion: "Documents Complete",
    suspensionDetails: {
      reason: "Scaffolding toe-board missing during safety spot-check.",
      suspendedAt: "2026-09-24 14:00",
      suspendedBy: "Wong Siew Leng (Head, Workplace Safety & Health)"
    },
    liftingRequest: {
      requestedAt: "2026-09-25 10:00",
      reason: "All missing scaffolding toe-boards installed and independently certified by safety officer.",
      status: "Pending Pre-screening",
      requestedBy: "David Tan (Project Manager)"
    },
    triggers: [
      "Working at Height Above 30 Metres",
      "High-Risk Work, Equipment and Vehicles"
    ],
    documents: [
      { id: "d1", name: "Safe Work Method Statement", type: "PDF", status: "Verified", uploadedAt: "2026-09-22", fileSize: "2.8 MB" },
      { id: "d2", name: "Toe-Board Rectification Photo & Sign-off", type: "PDF", status: "Verified", uploadedAt: "2026-09-25", fileSize: "1.5 MB" }
    ],
    workers: [
      { id: "w1", name: "David Tan", role: "Site Supervisor", idNumber: "S****123A", passType: "Work Permit", verified: true }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      { domain: "WSH Safety & Operations Oversight Group", approverName: "Wong Siew Leng", approverRole: "Head (Workplace Safety & Health)", departmentId: "wsh", status: "Approved", decidedAt: "2026-09-23 11:00" }
    ],
    submittedAt: "2026-09-22 10:00"
  },

  // 17. URGENT IPA GRANTED + DEFERRED DOCUMENTS OUTSTANDING (Kim Seng Construction)
  {
    id: "SEN/NP/20260924/017",
    companyName: "Kim Seng Construction Pte Ltd",
    companyUen: "199801234K",
    applicantName: "David Tan (Project Manager)",
    applicantPhone: "+65 9123 4567",
    applicantEmail: "david.tan@kimseng.sg",
    workDescription: "Urgent Seawall Armor Rock Replacement",
    durationCategory: "Project Work",
    location: "Siloso Beach Frontage Seawall",
    zone: "Sector 1 (North Siloso)",
    boundaryCoordinates: [
      { lat: 1.2500, lng: 103.8170 },
      { lat: 1.2510, lng: 103.8180 },
      { lat: 1.2505, lng: 103.8190 },
      { lat: 1.2495, lng: 103.8180 }
    ],
    startDateTime: "2026-09-24T08:00:00Z",
    endDateTime: "2026-10-15T18:00:00Z",
    workingHours: "08:00 – 18:00 (Daily)",
    isUrgent: true,
    hasBlackoutOverlap: false,
    applicationStatus: "Under Review",
    permitStatus: "Upcoming",
    ipaStatus: "Granted",
    ipaAuthorisedPeriod: "24 Sep 2026 08:00 – 27 Sep 2026 18:00 (Rock placement only)",
    ipaConditions: "Heavy mobile crane deployment restricted until certified PE lifting plan is verified.",
    documentCompletion: "Documents Outstanding",
    documentDeadline: "2026-10-02T18:00:00.000Z",
    deferredDocuments: [
      {
        id: "def-ks-1",
        name: "PE-Endorsed Mobile Crane Lifting Plan",
        requiredForTrigger: "High-Risk Work, Equipment and Vehicles",
        status: "Pending Submission",
        reviewerComments: ""
      },
      {
        id: "def-ks-2",
        name: "Marine Geotechnical Stability Verification",
        requiredForTrigger: "Excavation Work",
        status: "Pending Submission",
        reviewerComments: ""
      }
    ],
    triggers: [
      "Temporary Works Along the Seafront",
      "High-Risk Work, Equipment and Vehicles"
    ],
    documents: [
      { id: "d1", name: "Safe Work Procedure & Risk Assessment", type: "PDF", status: "Verified", uploadedAt: "2026-09-24", fileSize: "3.2 MB" },
      { id: "d2", name: "PE-Endorsed Mobile Crane Lifting Plan", type: "PDF", status: "Required", isDeferred: true, requiredBy: "02 Oct 2026", fileSize: "Pending Filing" },
      { id: "d3", name: "Marine Geotechnical Stability Verification", type: "PDF", status: "Required", isDeferred: true, requiredBy: "02 Oct 2026", fileSize: "Pending Filing" }
    ],
    workers: [
      { id: "w1", name: "David Tan", role: "Site Supervisor", idNumber: "S****123A", passType: "Work Permit", verified: true }
    ],
    sdcLiaisonOfficer: "Gary Ng (Senior Facilities Manager, IFM)",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      { domain: "Coastal & Maritime Engineering Group", approverName: "Capt. David Koh", approverRole: "Principal Coastal & Marine Specialist", departmentId: "marine", status: "Approved", decidedAt: "2026-09-24 14:00" },
      { domain: "WSH Safety & Operations Oversight Group", approverName: "Wong Siew Leng", approverRole: "Head (Workplace Safety & Health)", departmentId: "wsh", status: "Pending" }
    ],
    submittedAt: "2026-09-24 11:15"
  }

];

export const STORAGE_KEY = "sdc_nops_master_data_v8";
const BLACKOUT_KEY = "sdc_nops_blackouts_v3";

let nopsCache: NOPApplication[] | null = null;
export function loadStoredNops(): NOPApplication[] {
  if (nopsCache) return nopsCache;
  return INITIAL_NOPS;
}

export function saveStoredNops(data: NOPApplication[]): void {
  nopsCache = data;
  if (typeof window !== 'undefined') {
    fetch('/api/nop-data?col=nops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(console.error);
  }
}

let blackoutsCache: BlackoutDateConfig[] | null = null;
export function loadStoredBlackouts(): BlackoutDateConfig[] {
  return blackoutsCache || DEFAULT_BLACKOUT_DATES;
}

export function saveStoredBlackouts(data: BlackoutDateConfig[]): void {
  blackoutsCache = data;
}


/**
 * SINGAPORE PUBLIC HOLIDAYS & AUTOMATIC BLACKOUT ENGINE (FRD §6.4 / T23)
 */

export interface SentosaZoneItem {
  id: string;
  name: string;
  aliases: string[];
}

export const SENTOSA_PRECINCT_ZONES: SentosaZoneItem[] = [
  { id: "zone-siloso-1", name: "Sector 1 (North Siloso)", aliases: ["siloso beach sector 1", "siloso beach walk", "north siloso", "siloso sector 1", "siloso point", "siloso"] },
  { id: "zone-siloso-2", name: "Sector 2 (South Beach)", aliases: ["siloso beach sector 2", "south beach", "siloso sector 2", "sentosa cove"] },
  { id: "zone-palawan-3", name: "Sector 3 (Palawan Beach)", aliases: ["palawan beach promenade", "palawan beach", "palawan sector 3", "palawan beach walk", "palawan"] },
  { id: "zone-tanjong-4", name: "Sector 4 (Tanjong Beach)", aliases: ["tanjong beach", "tanjong beach walk", "tanjong"] },
  { id: "zone-gateway", name: "Sentosa Gateway & Arterial", aliases: ["sentosa gateway", "arterial road", "gateway", "gateway avenue"] },
  { id: "zone-island-all", name: "All Island Precincts", aliases: ["all island precincts", "island-wide", "whole island"] },
];

export function matchZone(zoneA?: string, zoneB?: string): boolean {
  if (!zoneA || !zoneB) return false;
  const a = zoneA.trim().toLowerCase();
  const b = zoneB.trim().toLowerCase();
  if (a === "all island precincts" || b === "all island precincts") return true;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const itemA = SENTOSA_PRECINCT_ZONES.find(z => z.name.toLowerCase() === a || z.id === a || z.aliases.some(al => a.includes(al) || al.includes(a)));
  const itemB = SENTOSA_PRECINCT_ZONES.find(z => z.name.toLowerCase() === b || z.id === b || z.aliases.some(al => b.includes(al) || al.includes(b)));
  if (itemA && itemB && itemA.id === itemB.id) return true;
  return false;
}

export const SINGAPORE_PUBLIC_HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-02-17", name: "Chinese New Year (Day 1)" },
  { date: "2026-02-18", name: "Chinese New Year (Day 2)" },
  { date: "2026-03-21", name: "Hari Raya Puasa" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-05-01", name: "Labour Day" },
  { date: "2026-05-27", name: "Hari Raya Haji" },
  { date: "2026-05-31", name: "Vesak Day" },
  { date: "2026-08-09", name: "National Day" },
  { date: "2026-08-10", name: "National Day (Observed)" },
  { date: "2026-11-08", name: "Deepavali" },
  { date: "2026-12-25", name: "Christmas Day" }
];

export function checkIslandBlackout(dateStr: string, zone?: string): { isBlackout: boolean; reason?: string; reasons?: string[]; isWeekend?: boolean; isHoliday?: boolean } {
  if (!dateStr) return { isBlackout: false };
  let isWeekend = false;
  let isHoliday = false;
  const reasons: string[] = [];
  try {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0 = Sun, 6 = Sat
    const ymd = dateStr.substring(0, 10);
    const holiday = SINGAPORE_PUBLIC_HOLIDAYS_2026.find((h) => h.date === ymd);
    if (holiday) {
      isHoliday = true;
      isWeekend = day === 0 || day === 6;
      reasons.push(`Singapore Public Holiday: ${holiday.name}`);
    } else if (day === 0 || day === 6) {
      isWeekend = true;
      reasons.push("Island-Wide Weekend Blackout (Sat & Sun)");
    }
  } catch {}

  try {
    const targetDate = new Date(dateStr.substring(0, 10)).getTime();
    if (!Number.isNaN(targetDate)) {
      const blackouts = loadStoredBlackouts();
      const zoneLc = (zone || "").trim().toLowerCase();
      for (const b of blackouts) {
        const bStart = new Date(b.startDate).getTime();
        const bEnd = new Date(b.endDate).getTime();
        if (Number.isNaN(bStart) || Number.isNaN(bEnd)) continue;
        const dateMatch = targetDate >= bStart && targetDate <= bEnd;
        if (!dateMatch) continue;

        const zoneMatch = b.zones.some((bz) => {
          const bzLc = bz.trim().toLowerCase();
          if (bzLc === "all island precincts") return true;
          if (!zoneLc) return false;
          if (bzLc.includes(zoneLc) || zoneLc.includes(bzLc)) return true;
          if (matchZone(bz, zoneLc)) return true;
          if (b.zoneIds && b.zoneIds.some(zid => {
            const item = SENTOSA_PRECINCT_ZONES.find(z => z.id === zid);
            return item && matchZone(item.name, zoneLc);
          })) return true;
          return false;
        });
        if (zoneMatch) {
          reasons.push(`${b.name} (${b.restrictionLevel})`);
        }
      }
    }
  } catch {}

  if (reasons.length > 0) {
    return { isBlackout: true, reason: reasons.join("; "), reasons, isWeekend, isHoliday };
  }
  return { isBlackout: false };
}

export function checkIslandBlackoutRange(startDateStr: string, endDateStr?: string, zone?: string): { isBlackout: boolean; reason?: string; reasons: string[]; isWeekend?: boolean; isHoliday?: boolean } {
  if (!startDateStr) return { isBlackout: false, reasons: [] };
  const allReasons: string[] = [];
  let isWeekend = false;
  let isHoliday = false;

  const startRes = checkIslandBlackout(startDateStr, zone);
  if (startRes.isBlackout && startRes.reason) {
    allReasons.push(...(startRes.reasons || [startRes.reason]));
    if (startRes.isWeekend) isWeekend = true;
    if (startRes.isHoliday) isHoliday = true;
  }

  if (endDateStr) {
    const endRes = checkIslandBlackout(endDateStr, zone);
    if (endRes.isBlackout && endRes.reason) {
      allReasons.push(...(endRes.reasons || [endRes.reason]));
      if (endRes.isWeekend) isWeekend = true;
      if (endRes.isHoliday) isHoliday = true;
    }
    try {
      const s = new Date(startDateStr).getTime();
      const e = new Date(endDateStr).getTime();
      for (let t = s + 86400000; t < e; t += 86400000) {
        const midStr = new Date(t).toISOString().substring(0, 10);
        const midRes = checkIslandBlackout(midStr, zone);
        if (midRes.isBlackout && midRes.reason) {
          allReasons.push(...(midRes.reasons || [midRes.reason]));
          if (midRes.isWeekend) isWeekend = true;
          if (midRes.isHoliday) isHoliday = true;
        }
      }
    } catch {}
  }

  const uniqueReasons = Array.from(new Set(allReasons));
  return {
    isBlackout: uniqueReasons.length > 0,
    reason: uniqueReasons.join("; "),
    reasons: uniqueReasons,
    isWeekend,
    isHoliday
  };
}

export function getSgtDateTimeString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === "year")?.value;
  const month = parts.find(p => p.type === "month")?.value;
  const day = parts.find(p => p.type === "day")?.value;
  const hour = parts.find(p => p.type === "hour")?.value;
  const minute = parts.find(p => p.type === "minute")?.value;
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * Calculate Document Deadline from IPA grant time (FRD §6.5.1 / T26 / T27)
 * Uses N continuous 24-hour calendar days (default 3 continuous days)
 */
export function calculateDocumentDeadline(ipaGrantedAtStr: string, daysN = 3): string {
  try {
    const granted = new Date(ipaGrantedAtStr);
    const deadline = new Date(granted.getTime() + daysN * 24 * 60 * 60 * 1000);
    return deadline.toISOString();
  } catch {
    const now = new Date();
    return new Date(now.getTime() + daysN * 24 * 60 * 60 * 1000).toISOString();
  }
}

export { recordNopAudit } from "./nopAudit";

export function syncPendingApprovalsWithMatrix(applications: NOPApplication[]): NOPApplication[] {
  return applications.map((nop) => {
    if (nop.applicationStatus !== "Under Review" || !nop.domainApprovals) return nop;
    const updatedApprovals = nop.domainApprovals.map((app) => {
      if (app.status !== "Pending") return app;
      const matchedRule = ROUTING_MATRIX_RULES.find((r) => r.trigger === app.domain || app.domain.includes(r.trigger));
      if (matchedRule) {
        return {
          ...app,
          approverGroup: matchedRule.approverGroup || app.approverGroup
        };
      }
      return app;
    });
    return { ...nop, domainApprovals: updatedApprovals };
  });
}

/* ────────────────────────────────────────────────────────────────
   Editable Approval Matrix (persisted) + re-application to
   approval steps that are still awaiting a decision.
   Completed decisions are never altered.
   ──────────────────────────────────────────────────────────────── */

const ROUTING_KEY = "sdc_nop_routing_matrix_v1";

let routingCache: RoutingMatrixRule[] | null = null;
export function loadStoredRouting(): RoutingMatrixRule[] {
  return routingCache || ROUTING_MATRIX_RULES;
}

export function saveStoredRouting(rules: RoutingMatrixRule[]): void {
  routingCache = rules;
}

export interface RoutingReassignment {
  nopId: string;
  domain: string;
  fromApprover: string;
  toApprover: string;
  fromGroup?: string;
  toGroup?: string;
}

/**
 * Applies the current approval matrix to every approval step that is still
 * awaiting a decision. Steps already decided (Approved / Change Requested)
 * keep their recorded approver, group, decision and timestamp.
 */
export function reapplyRoutingToPendingSteps(
  applications: NOPApplication[],
  rules: RoutingMatrixRule[],
  targetRuleId?: string | null
): { applications: NOPApplication[]; reassignments: RoutingReassignment[] } {
  const reassignments: RoutingReassignment[] = [];
  if (targetRuleId === null) {
    return { applications, reassignments };
  }

  const updated = applications.map((nop) => {
    if (!nop.domainApprovals || nop.domainApprovals.length === 0) return nop;
    if (nop.applicationStatus === "Approved" || nop.applicationStatus === "Withdrawn") return nop;

    let touched = false;
    const nextApprovals = nop.domainApprovals.map((step) => {
      if (step.status !== "Pending") return step;

      // CFG-01 & CFG-02: Strictly match by ruleId without cross-group fallback pollution
      let rule: RoutingMatrixRule | undefined;
      if (step.ruleId) {
        if (targetRuleId && step.ruleId !== targetRuleId) return step;
        rule = rules.find((r) => r.id === step.ruleId);
      } else {
        rule =
          rules.find((r) => r.trigger === step.domain) ||
          rules.find((r) => (r.approverGroup && r.approverGroup === step.approverGroup) || (r.primaryApprover && (r.primaryApprover === step.approverRole || r.primaryApprover === step.domain))) ||
          rules.find((r) => r.trigger && (step.domain.toLowerCase().includes(r.trigger.toLowerCase()) || r.trigger.toLowerCase().includes(step.domain.toLowerCase())));
        if (targetRuleId && rule?.id !== targetRuleId) return step;
      }

      if (!rule || rule.active === false) return step;

      // Assign actual officer/persona name or group rep, preserving TA queue
      const nextApprover = rule.officerName || (rule.primaryApprover ? getApproverPersonForRole(rule.primaryApprover) : undefined) || step.approverName;
      const nextGroup = rule.approverGroup || step.approverGroup;
      if (nextApprover === step.approverName && nextGroup === step.approverGroup) return step;

      reassignments.push({
        nopId: nop.id,
        domain: step.domain,
        fromApprover: step.approverName,
        toApprover: nextApprover,
        fromGroup: step.approverGroup,
        toGroup: nextGroup
      });
      touched = true;
      return {
        ...step,
        approverName: nextApprover,
        approverRole: rule.approverGroup || rule.primaryApprover || step.approverRole,
        approverGroup: nextGroup,
        departmentId: rule.departmentId || step.departmentId,
        ruleId: rule.id
      };
    });

    return touched ? { ...nop, domainApprovals: nextApprovals, updatedAt: new Date().toISOString() } : nop;
  });

  return { applications: updated, reassignments };
}

export { isValidSingaporePhone, isValidSingaporeUen, isValidEmail } from "./nopValidators";

// ──────────────────────────────────────────────────────────────────
// ASYNC API METHODS for MongoDB (Phase 3)
// ──────────────────────────────────────────────────────────────────
async function genericFetch(col: string) {
  try {
    const res = await fetch(`/api/nop-data?col=${col}`);
    if (!res.ok) throw new Error(`Failed to fetch ${col}`);
    return await res.json();
  } catch (err) {
    console.warn(`genericFetch failed for ${col}, using local fallback:`, err);
    if (col === 'nops') return loadStoredNops();
    if (col === 'blackouts') return loadStoredBlackouts();
    if (col === 'routing') return loadStoredRouting();
    if (col === 'approver_titles') return loadStoredApproverTitles();
    if (col === 'approver_groups') return loadStoredApproverGroups();
    if (col === 'urgent_docs') return loadStoredUrgentDocClassification();
    return [];
  }
}

async function genericSave(col: string, data: any) {
  try {
    const res = await fetch(`/api/nop-data?col=${col}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to save ${col}`);
  } catch (err) {
    console.warn(`genericSave failed for ${col}, persisting to local storage only:`, err);
  }
}

export async function fetchNopData() {
  const data = await genericFetch('nops');
  saveStoredNops(data);
  return data;
}
export async function apiSaveNops(data: NOPApplication[]) {
  await genericSave('nops', data);
  saveStoredNops(data);
}

export async function fetchBlackouts() {
  const data = await genericFetch('blackouts');
  saveStoredBlackouts(data);
  return data;
}
export async function apiSaveBlackouts(data: BlackoutDateConfig[]) {
  await genericSave('blackouts', data);
  saveStoredBlackouts(data);
}

export async function fetchRoutingRules() {
  const data = await genericFetch('routing');
  saveStoredRouting(data);
  return data;
}
export async function apiSaveRoutingRules(data: RoutingMatrixRule[]) {
  await genericSave('routing', data);
  saveStoredRouting(data);
}

export async function fetchApproverTitles() {
  const data = await genericFetch('approver_titles');
  saveStoredApproverTitles(data);
  return data;
}
export async function apiSaveApproverTitles(data: ApproverTitleCatalogItem[]) {
  await genericSave('approver_titles', data);
  saveStoredApproverTitles(data);
}

export async function fetchApproverGroups() {
  const data = await genericFetch('approver_groups');
  saveStoredApproverGroups(data);
  return data;
}
export async function apiSaveApproverGroups(data: ApproverGroupCatalogItem[]) {
  await genericSave('approver_groups', data);
  saveStoredApproverGroups(data);
}

export async function fetchUrgentDocs() {
  const data = await genericFetch('urgent_docs');
  saveStoredUrgentDocClassification(data);
  return data;
}
export async function apiSaveUrgentDocs(data: UrgentDocClassificationMap) {
  await genericSave('urgent_docs', data);
  saveStoredUrgentDocClassification(data);
}


export async function fetchNopsFromMongo(): Promise<NOPApplication[]> {
  try {
    const res = await fetch('/api/nop-data?col=nops');
    if (res.ok) {
      const data = await res.json();
      nopsCache = data;
      return data;
    }
  } catch (err) {
    console.error(err);
  }
  return loadStoredNops();
}
