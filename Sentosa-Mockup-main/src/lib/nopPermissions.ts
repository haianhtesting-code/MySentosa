// NOP permission codes + role-to-permission mapping (SDC NOP FRD v0.5 Section 2).
// Client-safe pure functions for UI button gating, navigation filtering, and guard checks.

import { UserRole } from "@/context/RoleContext";

export type NopPermission =
  | "nop.view_own"            // View applications created by own organization
  | "nop.view_assigned"       // View applications assigned to user as LO or Approver
  | "nop.view_all"            // View all NOP records across the island
  | "nop.apply"               // Submit new NOP application
  | "nop.save_draft"          // Save and resume draft applications
  | "nop.resubmit"            // Amend and resubmit when changes requested
  | "nop.upload_deferred"     // Upload deferred documents (post-IPA)
  | "nop.request_extension"   // Request 1-month permit validity extension
  | "nop.request_cancel"      // Request cancellation of permit
  | "nop.request_lift"        // Request lifting of stop-work suspension
  | "nop.prescreen"           // Liaison Officer pre-screening of applications
  | "nop.request_changes"     // LO requests contractor amendments
  | "nop.clear_for_approval"  // LO forwards application to technical approver queue
  | "nop.endorse_clearance"   // Technical Approver endorses departmental clearance
  | "nop.request_revisions"   // Approver requests revisions / clarifications
  | "nop.suspend_permit"      // Authorised SDC role issues stop-work suspension
  | "nop.revoke_permit"       // Permanently revokes an issued permit
  | "nop.lift_suspension"     // Authorised SDC role lifts suspension to resume work
  | "nop.grant_ipa"           // Approvers / Ops Admin grant Urgent In-Principle Approval
  | "nop.request_ipa"         // Duty Manager requests In-Principle Approval from approvers
  | "nop.verify_qr"           // Scan and verify digital certificate QR code
  | "nop.config_moratorium"   // Manage blackout calendar & rules
  | "nop.config_rules"        // Manage SLA matrix & insurance requirements
  | "nop.export_xlsx"         // Export XLSX dataset (OR Team & Ops Admin)
  | "nop.export_pdf";         // Export PDF summary report

const NOP_ROLE_PERMISSIONS: Partial<Record<UserRole, NopPermission[]>> = {
  "Applicant (Contractor)": [
    "nop.view_own",
    "nop.apply",
    "nop.save_draft",
    "nop.resubmit",
    "nop.upload_deferred",
    "nop.request_extension",
    "nop.request_cancel",
    "nop.request_lift",
    "nop.verify_qr",
    "nop.export_pdf"
  ],

  "Stakeholder Manager": [
    "nop.view_own",
    "nop.apply",
    "nop.save_draft",
    "nop.resubmit",
    "nop.upload_deferred",
    "nop.request_extension",
    "nop.request_cancel",
    "nop.request_lift",
    "nop.verify_qr",
    "nop.export_pdf"
  ],

  "Liaison Officer": [
    "nop.view_assigned",
    "nop.prescreen",
    "nop.request_changes",
    "nop.clear_for_approval",
    "nop.verify_qr",
    "nop.export_pdf"
  ],

  "Technical Approver": [
    "nop.view_assigned",
    "nop.endorse_clearance",
    "nop.request_revisions",
    "nop.suspend_permit",
    "nop.revoke_permit",
    "nop.lift_suspension",
    "nop.verify_qr",
    "nop.export_pdf"
  ],

  "Duty Manager": [
    "nop.view_all",
    "nop.request_ipa",
    "nop.verify_qr",
    "nop.export_pdf"
  ],

  "Responder (Ranger)": [
    "nop.view_all",
    "nop.verify_qr"
  ],

  "NOP Operations Admin": [
    "nop.view_all",
    "nop.apply",
    "nop.save_draft",
    "nop.resubmit",
    "nop.upload_deferred",
    "nop.request_extension",
    "nop.request_cancel",
    "nop.request_lift",
    "nop.prescreen",
    "nop.request_changes",
    "nop.clear_for_approval",
    "nop.endorse_clearance",
    "nop.request_revisions",
    "nop.suspend_permit",
    "nop.revoke_permit",
    "nop.lift_suspension",
    "nop.grant_ipa",
    "nop.verify_qr",
    "nop.config_moratorium",
    "nop.config_rules",
    "nop.export_xlsx",
    "nop.export_pdf"
  ],

  "SDC Stakeholder / Operational Viewer (incl. OR Team)": [
    "nop.view_all",
    "nop.verify_qr",
    "nop.export_xlsx",
    "nop.export_pdf"
  ],

  "NOP Business Owner": [
    "nop.view_all",
    "nop.verify_qr",
    "nop.export_pdf"
  ],

  "System Administrator": [
    "nop.view_all"
  ],

  "Duty Officer": [
    "nop.view_all",
    "nop.verify_qr"
  ],

  "Controller": [
    "nop.view_all",
    "nop.verify_qr"
  ]
};

export function hasNopPermission(
  role: UserRole | string,
  permission: NopPermission,
  options?: { canActAsApplicant?: boolean; isOrTeam?: boolean; username?: string; orgUnit?: string }
): boolean {
  if (role === "Current Ops Administrator") role = "NOP Operations Admin";
  if (role === "Stakeholder") role = "SDC Stakeholder / Operational Viewer (incl. OR Team)";

  if (role === "Stakeholder Manager" && options?.canActAsApplicant === false) {
    const applicantMutating: NopPermission[] = [
      "nop.apply",
      "nop.save_draft",
      "nop.resubmit",
      "nop.upload_deferred",
      "nop.request_extension",
      "nop.request_cancel",
      "nop.request_lift"
    ];
    if (applicantMutating.includes(permission)) return false;
  }

  // REG-16: SDC Stakeholder only has nop.export_xlsx if isOrTeam === true
  if (role === "SDC Stakeholder / Operational Viewer (incl. OR Team)" && permission === "nop.export_xlsx") {
    if (options?.isOrTeam !== undefined) {
      return !!options.isOrTeam;
    }
  }

  const perms = NOP_ROLE_PERMISSIONS[role as UserRole];
  if (!perms) return false;
  return perms.includes(permission);
}

export function getNopPermissionsForRole(role: UserRole | string): NopPermission[] {
  if (role === "Current Ops Administrator") role = "NOP Operations Admin";
  if (role === "Stakeholder") role = "SDC Stakeholder / Operational Viewer (incl. OR Team)";
  return NOP_ROLE_PERMISSIONS[role as UserRole] || [];
}

/**
 * Checks whether user can view/access a given NOP application record.
 * Used uniformly across Register, Approvals queues, Map, Portal, and Dossier.
 */
export function canAccessNopRecord(
  roleOrUser: UserRole | string | { role: UserRole | string; username?: string; email?: string; companyName?: string; company?: string; department?: string; approverDept?: string; departmentId?: string; canActAsApplicant?: boolean },
  record: {
    id?: string;
    referenceNumber?: string;
    applicationStatus?: string;
    applicantName?: string;
    applicantEmail?: string;
    creatorEmail?: string;
    creatorUsername?: string;
    companyName?: string;
    companyUen?: string;
    sdcLiaisonOfficer?: string;
    domainApprovals?: { domain?: string; approverGroup?: string; approverRole?: string; departmentId?: string; approverName?: string }[];
  },
  currentUserEmail?: string,
  currentUsername?: string
): boolean {
  let role: string;
  let username = currentUsername;
  let email = currentUserEmail;
  let companyName: string | undefined;

  if (typeof roleOrUser === "string") {
    role = roleOrUser;
  } else {
    role = roleOrUser.role;
    if (!username) username = roleOrUser.username;
    if (!email) email = roleOrUser.email;
    companyName = roleOrUser.companyName || roleOrUser.company;
  }

  if (role === "Current Ops Administrator") role = "NOP Operations Admin";
  if (role === "Stakeholder") role = "SDC Stakeholder / Operational Viewer (incl. OR Team)";

  const recId = record?.id || record?.referenceNumber || "";
  const isDraft = record?.applicationStatus === "Draft" || recId.startsWith("DRAFT-") || recId.startsWith("DFT-");

  // Drafts: strictly creator/owner can access (SEC-10, SEC-11)
  if (isDraft) {
    const norm = (s?: string) => s?.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").trim() || "";
    const normEmail = (e?: string) => e?.toLowerCase().replace(/\.com\.sg$/, ".sg").trim() || "";

    if (email) {
      const eNorm = normEmail(email);
      if (record.creatorEmail && normEmail(record.creatorEmail) === eNorm) return true;
      if (record.applicantEmail && normEmail(record.applicantEmail) === eNorm) return true;
    }
    if (username) {
      const uNorm = norm(username);
      if (record.creatorUsername && (norm(record.creatorUsername) === uNorm || norm(record.creatorUsername).includes(uNorm) || uNorm.includes(norm(record.creatorUsername)))) return true;
      if (record.applicantName && (norm(record.applicantName) === uNorm || norm(record.applicantName).includes(uNorm) || uNorm.includes(norm(record.applicantName)))) return true;
    }
    // Organization match for applicant role
    if ((role === "Applicant (Contractor)" || role === "Stakeholder Manager") && record.companyName) {
      const userCompany = companyName || "Kim Seng Construction Pte Ltd";
      if (
        record.companyName.toLowerCase().includes(userCompany.toLowerCase()) ||
        userCompany.toLowerCase().includes(record.companyName.toLowerCase()) ||
        (userCompany.toLowerCase().includes("kim seng") && record.companyName.toLowerCase().includes("kim seng"))
      ) {
        const uNorm = norm(username);
        if (!record.applicantName && !record.creatorUsername) return true;
        if (username && (norm(record.applicantName || "").includes(uNorm) || uNorm.includes(norm(record.applicantName || "")))) return true;
      }
    }
    const hasOwnerInfo = !!(record.creatorEmail || record.creatorUsername || record.applicantEmail || record.applicantName);
    if (!hasOwnerInfo && (role === "Applicant (Contractor)" || role === "Stakeholder Manager")) {
      return true;
    }
    return false;
  }

  // Applicant and Stakeholder Manager: ONLY records of own organization (P0-04)
  if (role === "Applicant (Contractor)" || role === "Stakeholder Manager") {
    if (companyName) {
      if (
        record.companyName &&
        (record.companyName.toLowerCase().includes(companyName.toLowerCase()) ||
         companyName.toLowerCase().includes(record.companyName.toLowerCase()))
      ) {
        return true;
      }
      return false;
    }
    const userCompany = "Kim Seng Construction Pte Ltd";
    if (record.companyName && (
      record.companyName.toLowerCase().includes(userCompany.toLowerCase()) ||
      userCompany.toLowerCase().includes(record.companyName.toLowerCase())
    )) {
      if (!username && !email) return true;
      if (username && record.applicantName && (record.applicantName.toLowerCase().includes(username.toLowerCase()) || username.toLowerCase().includes(record.applicantName.toLowerCase()))) {
        return true;
      }
    }
    if (record.applicantEmail && email && record.applicantEmail.toLowerCase() === email.toLowerCase()) {
      return true;
    }
    if (username && record.applicantName && (record.applicantName.toLowerCase().includes(username.toLowerCase()) || username.toLowerCase().includes(record.applicantName.toLowerCase()))) {
      return true;
    }
    return false;
  }

  // Liaison Officer: can access if assigned as LO, or if unassigned
  if (role === "Liaison Officer") {
    if (!record.sdcLiaisonOfficer) return true;
    const u = (username || "").toLowerCase();
    const lo = record.sdcLiaisonOfficer.toLowerCase();
    if (u && (lo.includes(u) || u.includes(lo))) return true;
    if (email && lo.includes(email.toLowerCase())) return true;
    // If username is not set, allow general access
    if (!username) return true;
    return false;
  }

  // Technical Approver: scoped to NOPs that involve their approver group/domain (SEC-04, NEW-07)
  if (role === "Technical Approver") {
    if (!record.domainApprovals || record.domainApprovals.length === 0) return true;
    const dept = typeof roleOrUser === "object" ? ((roleOrUser as any).departmentId || (roleOrUser as any).approverDept || (roleOrUser as any).department) : undefined;
    if (dept && dept !== "all") {
      const match = record.domainApprovals.some(da => 
        (da.departmentId && da.departmentId.toLowerCase() === dept.toLowerCase()) ||
        (da.domain && da.domain.toLowerCase() === dept.toLowerCase()) ||
        (da.approverGroup && da.approverGroup.toLowerCase().includes(dept.toLowerCase()))
      );
      if (match) return true;
    }
    if (username) {
      const u = username.toLowerCase();
      const match = record.domainApprovals.some(da => 
        (da.approverName && da.approverName.toLowerCase().includes(u)) ||
        (da.approverRole && da.approverRole.toLowerCase().includes(u)) ||
        (da.domain && u.includes(da.domain.toLowerCase()))
      );
      if (match) return true;
    }
    if (!dept && !username) return true;
    return false;
  }

  // Internal roles that can view all submitted NOP records
  if ([
    "System Administrator",
    "NOP Operations Admin",
    "Duty Manager",
    "SDC Stakeholder / Operational Viewer (incl. OR Team)",
    "Responder (Ranger)",
    "Duty Officer",
    "Controller",
    "NOP Business Owner"
  ].includes(role)) {
    return true;
  }

  return false;
}

/**
 * SEC-15: Contact details (applicant, PIC, emergency contacts) visibility rule.
 * ONLY visible to Ops Admin, assigned LO, assigned Approvers, DM, Controller, Duty Officer, and Ranger;
 * MASKED for NOP Business Owner and SDC Stakeholders.
 */
export function isContactVisible(
  user: { role: string; username?: string; email?: string; approverDept?: string },
  nop?: { sdcLiaisonOfficer?: string; domainApprovals?: { approverRole?: string; departmentId?: string; domain?: string }[] }
): boolean {
  if (!user || !user.role) return false;
  let role = user.role;
  if (role === "Current Ops Administrator") role = "NOP Operations Admin";
  if (role === "Stakeholder") role = "SDC Stakeholder / Operational Viewer (incl. OR Team)";

  // Ops Admin, DM, Controller, Duty Officer, Ranger always have visibility
  if ([
    "NOP Operations Admin",
    "Duty Manager",
    "Controller",
    "Duty Officer",
    "Responder (Ranger)"
  ].includes(role)) {
    return true;
  }

  // Assigned LO of this NOP
  if (role === "Liaison Officer") {
    if (!nop?.sdcLiaisonOfficer || !user.username) return true;
    return (
      nop.sdcLiaisonOfficer === user.username ||
      nop.sdcLiaisonOfficer.toLowerCase().includes((user.username || "").toLowerCase()) ||
      (user.username || "").toLowerCase().includes(nop.sdcLiaisonOfficer.toLowerCase())
    );
  }

  // Assigned Approver of this NOP
  if (role === "Technical Approver") {
    if (!nop?.domainApprovals || nop.domainApprovals.length === 0) return true;
    if (user.approverDept && user.approverDept !== "all") {
      return nop.domainApprovals.some(da => da.departmentId === user.approverDept || da.domain?.toLowerCase() === user.approverDept?.toLowerCase());
    }
    return true;
  }

  // Applicant/SM viewing own contacts
  if (role === "Applicant (Contractor)" || role === "Stakeholder Manager") {
    return true;
  }

  // NOP Business Owner, SDC Stakeholder (incl OR Team), System Administrator: MASKED
  return false;
}

export function maskContactPhone(phone?: string): string {
  if (!phone || phone.length < 4) return phone || "";
  const trimmed = phone.trim();
  const visible = trimmed.slice(-4);
  const prefix = trimmed.slice(0, -4);
  return `${prefix.replace(/\d/g, "*")}${visible}`;
}

export function maskContactEmail(email?: string): string {
  if (!email || !email.includes("@")) return email || "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

export function getNopRoleBadge(role: UserRole | string): { label: string; color: string; bg: string; border: string } {
  switch (role) {
    case "NOP Operations Admin":
    case "Current Ops Administrator":
      return { label: "Ops Admin", color: "text-purple-800", bg: "bg-purple-100", border: "border-purple-300" };
    case "Liaison Officer":
      return { label: "Liaison Officer", color: "text-blue-800", bg: "bg-blue-100", border: "border-blue-300" };
    case "Technical Approver":
      return { label: "Approver", color: "text-indigo-800", bg: "bg-indigo-100", border: "border-indigo-300" };
    case "Duty Manager":
      return { label: "Duty Mgr", color: "text-amber-800", bg: "bg-amber-100", border: "border-amber-300" };
    case "Applicant (Contractor)":
      return { label: "Contractor", color: "text-emerald-800", bg: "bg-emerald-100", border: "border-emerald-300" };
    case "Stakeholder Manager":
      return { label: "Stakeholder Mgr", color: "text-cyan-800", bg: "bg-cyan-100", border: "border-cyan-300" };
    case "System Administrator":
      return { label: "SysAdmin", color: "text-rose-800", bg: "bg-rose-100", border: "border-rose-300" };
    default:
      return { label: role, color: "text-gray-800", bg: "bg-gray-100", border: "border-gray-300" };
  }
}

export function isOversightRole(role?: UserRole | string): boolean {
  return role === "NOP Operations Admin" || role === "Current Ops Administrator";
}

const normPerson = (s?: string) => (s || "").toLowerCase().replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();

type WorkflowUser = { role: string; username?: string; approverDept?: string };

function normaliseRole(role: string): string {
  return role === "Current Ops Administrator" ? "NOP Operations Admin" : role;
}

/** True when the persona is the assigned Liaison Officer of the NOP (or an Ops Admin). */
export function isAssignedLiaisonOfficer(
  user: WorkflowUser,
  nop?: { sdcLiaisonOfficer?: string }
): boolean {
  const role = normaliseRole(user.role);
  if (role === "NOP Operations Admin") return true;
  if (role !== "Liaison Officer") return false;
  if (!nop?.sdcLiaisonOfficer) return true;
  const u = normPerson(user.username);
  const lo = normPerson(nop.sdcLiaisonOfficer);
  return !!u && (lo === u || lo.includes(u) || u.includes(lo));
}

export function inferDepartmentId(da: { departmentId?: string; domain?: string; approverGroup?: string; approverRole?: string }): string | undefined {
  if (da.departmentId) return da.departmentId;
  const s = `${da.domain || ""} ${da.approverGroup || ""} ${da.approverRole || ""}`.toLowerCase();
  if (s.includes("express") || s.includes("rail")) return "express";
  if (s.includes("cableway") || s.includes("ropeway")) return "cableway";
  if (s.includes("traffic") || s.includes("road")) return "traffic";
  if (s.includes("structural") || s.includes("civil") || s.includes("c&s") || s.includes("retaining")) return "structural";
  if (s.includes("geotech") || s.includes("excavat")) return "geotechnical";
  if (s.includes("landscape") || s.includes("arbor") || s.includes("tree") || s.includes("ecology") || s.includes("vegetation")) return "landscape";
  if (s.includes("marine") || s.includes("seafront") || s.includes("coastal")) return "marine";
  if (s.includes("precinct") || s.includes("facilities") || s.includes("1 hour")) return "precinct";
  if (s.includes("safety") || s.includes("wsh") || s.includes("high-risk") || s.includes("confined") || s.includes("height")) return "wsh";
  if (s.includes("central ops") || s.includes("operations authority") || s.includes("ops admin")) return "ops";
  return undefined;
}

/** True when the domain approval step is assigned to this persona (by department or exact officer name). */
export function isDomainApproverForUser(
  da: { approverName?: string; departmentId?: string; approverRole?: string; domain?: string; approverGroup?: string },
  user: WorkflowUser
): boolean {
  const role = normaliseRole(user.role);
  if (role === "NOP Operations Admin") return true;
  if (role !== "Technical Approver") return false;
  const daDept = da.departmentId || inferDepartmentId(da);
  if (user.approverDept && user.approverDept !== "all" && daDept && daDept.toLowerCase() === user.approverDept.toLowerCase()) {
    return true;
  }
  const u = normPerson(user.username);
  if (u) {
    const aName = normPerson(da.approverName);
    if (aName && (aName === u || aName.includes(u) || u.includes(aName))) return true;
  }
  return false;
}

/** True when the persona is assigned to at least one approval step of the NOP. */
export function isAssignedApproverOfNop(
  user: WorkflowUser,
  nop?: { domainApprovals?: { approverName?: string; departmentId?: string; domain?: string; approverRole?: string }[] }
): boolean {
  const role = normaliseRole(user.role);
  if (role === "NOP Operations Admin") return true;
  if (role !== "Technical Approver") return false;
  return !!nop?.domainApprovals?.some((da) => isDomainApproverForUser(da, user));
}

/**
 * Whether the persona may Endorse / Reject a specific approval step right now:
 * application Under Review, LO has cleared it, step still Pending or Change Requested, persona holds the permission and owns the step.
 */
export function canActOnDomainApproval(
  user: WorkflowUser,
  nop: { applicationStatus?: string; loPreScreenStatus?: string },
  da: { status?: string; approverName?: string; departmentId?: string; domain?: string; approverRole?: string; approverGroup?: string }
): boolean {
  if (nop.applicationStatus !== "Under Review") return false;
  if (nop.loPreScreenStatus !== "Cleared for Approval") return false;
  if (da.status !== "Pending" && da.status !== "Change Requested") return false;
  if (!hasNopPermission(user.role, "nop.endorse_clearance")) return false;
  return isDomainApproverForUser(da, user);
}

export function canDecideRequestWithSoD(
  request: { clearedBy?: string },
  currentUsername: string
): boolean {
  if (!request?.clearedBy) return true;
  return request.clearedBy.trim().toLowerCase() !== currentUsername.trim().toLowerCase();
}

export function maskNricFin(nric?: string): string {
  if (!nric || nric.length < 5) return nric || "";
  const first = nric[0];
  const lastFour = nric.slice(-4);
  return `${first}****${lastFour}`;
}
