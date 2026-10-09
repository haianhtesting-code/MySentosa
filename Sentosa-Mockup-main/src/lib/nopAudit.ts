let auditCache: string | null = null;
// Structured NOP Audit Trail Service (SDC NOP FRD v0.5 Section 10)
// Captures immutable compliance events across all NOP lifecycle transitions.

export interface NopAuditEntry {
  id: string;
  nopId: string;
  action: string;
  actionLabel?: string;
  actor: string;
  role?: string;
  actorRole?: string;
  timestamp: string;
  details?: string;
  comment?: string;
  comments?: string;
  before?: any;
  after?: any;
  changesDiff?: {
    field: string;
    before: string;
    after: string;
  }[];
}

import type { NOPApplication } from "./nopData";
import { INITIAL_NOPS } from "./nopData";

const STORAGE_KEY = "sdc_nop_audit_trail_v1";

function getSeedNops(): NOPApplication[] {
  if (typeof window === "undefined") return INITIAL_NOPS;
  try {
    const raw = null;
    if (!raw) return INITIAL_NOPS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_NOPS;
  } catch {
    return INITIAL_NOPS;
  }
}

export function generateSeedAuditTrail(nopId: string): NopAuditEntry[] {
  const nops = getSeedNops();
  const nop = nops.find((n) => n.id.toLowerCase() === nopId.toLowerCase());
  if (!nop) {
    return [
      {
        id: `AUD-INIT-01-${nopId}`,
        nopId,
        action: "SUBMIT",
        actionLabel: "Application Submitted",
        actor: "Contractor Applicant",
        role: "Applicant (Contractor)",
        timestamp: "2026-09-16T14:30:00.000Z",
        comment: "NOP Application submitted with mandatory baseline risk assessment and method statements."
      }
    ];
  }

  // NOP-13: Dedicated comprehensive timeline for SEN/NP/20260912/011
  if (nop.id === "SEN/NP/20260912/011") {
    return [
      {
        id: `AUD-07-${nop.id}`,
        nopId: nop.id,
        action: "REQUEST_LIFT_SUSPENSION",
        actionLabel: "Suspension Lifting Requested",
        actor: "Michael Wee (Marine Works Supervisor)",
        role: "Applicant (Contractor)",
        timestamp: "2026-09-20T09:00:00.000Z",
        comment: "Contractor rectification submitted: All 3 commercial divers have renewed their diving certifications; Commercial Diving Certification (Renewed).pdf uploaded for audit clearance."
      },
      {
        id: `AUD-06-${nop.id}`,
        nopId: nop.id,
        action: "SUSPEND_PERMIT",
        actionLabel: "Permit Suspended",
        actor: "Wong Siew Leng (Head, Workplace Safety & Health)",
        role: "Technical Approver",
        timestamp: "2026-09-18T10:00:00.000Z",
        comment: "Safety stop-work order issued during routine field safety spot-check. Reason: Diver certification found expired during routine field audit."
      },
      {
        id: `AUD-05-${nop.id}`,
        nopId: nop.id,
        action: "PERMIT_ISSUED",
        actionLabel: "Permit Issued",
        actor: "SDC IIS Automated Issuance System",
        role: "System Administrator",
        timestamp: "2026-09-09T17:00:00.000Z",
        comment: "All technical domain clearances endorsed. Official electronic Permit Certificate and digital QR code generated."
      },
      {
        id: `AUD-04-${nop.id}`,
        nopId: nop.id,
        action: "ENDORSE",
        actionLabel: "Technical Clearance Endorsed",
        actor: "Wong Siew Leng",
        role: "Technical Approver",
        timestamp: "2026-09-09T16:30:00.000Z",
        comment: "WSH Safety & Operations Oversight Group clearance endorsed. High-risk diving operations procedure and decompression protocols verified."
      },
      {
        id: `AUD-03-${nop.id}`,
        nopId: nop.id,
        action: "ENDORSE",
        actionLabel: "Technical Clearance Endorsed",
        actor: "Capt. David Koh",
        role: "Technical Approver",
        timestamp: "2026-09-09T15:00:00.000Z",
        comment: "Coastal & Maritime Engineering Group clearance endorsed. Tidal and shoreline safety conditions verified."
      },
      {
        id: `AUD-02-${nop.id}`,
        nopId: nop.id,
        action: "PRESCREEN_CLEAR",
        actionLabel: "Pre-screening Cleared",
        actor: "Gary Ng (Senior Facilities Manager, IFM)",
        role: "Liaison Officer",
        timestamp: "2026-09-08T14:00:00.000Z",
        comment: "LO Pre-screening passed. Baseline Risk Assessment, Method Statement, and Location Plan verified. Routed to Coastal and WSH groups."
      },
      {
        id: `AUD-01-${nop.id}`,
        nopId: nop.id,
        action: "SUBMIT",
        actionLabel: "Application Submitted",
        actor: "Michael Wee (Marine Works Supervisor)",
        role: "Applicant (Contractor)",
        timestamp: "2026-09-08T10:00:00.000Z",
        comment: "NOP application submitted for underwater jetty pile corrosion repair & cathodic anode fitting."
      }
    ];
  }

  const entries: NopAuditEntry[] = [];

  if (nop.liftingRequest) {
    entries.push({
      id: `AUD-LR-${nop.id}`,
      nopId: nop.id,
      action: "REQUEST_LIFT_SUSPENSION",
      actionLabel: "Suspension Lifting Requested",
      actor: nop.liftingRequest.requestedBy || nop.applicantName,
      role: "Applicant (Contractor)",
      timestamp: nop.liftingRequest.requestedAt ? new Date(nop.liftingRequest.requestedAt).toISOString() : "2026-09-20T09:00:00.000Z",
      comment: `Lifting requested: ${nop.liftingRequest.reason}`
    });
  }

  if (nop.suspensionDetails) {
    entries.push({
      id: `AUD-SUSP-${nop.id}`,
      nopId: nop.id,
      action: "SUSPEND_PERMIT",
      actionLabel: "Permit Suspended",
      actor: nop.suspensionDetails.suspendedBy,
      role: "Technical Approver",
      timestamp: nop.suspensionDetails.suspendedAt ? new Date(nop.suspensionDetails.suspendedAt).toISOString() : "2026-09-18T10:00:00.000Z",
      comment: `Permit suspended: ${nop.suspensionDetails.reason}`
    });
  }

  if (nop.applicationStatus === "Approved") {
    entries.push({
      id: `AUD-ISSUE-${nop.id}`,
      nopId: nop.id,
      action: "PERMIT_ISSUED",
      actionLabel: "Permit Issued",
      actor: "SDC IIS Automated Issuance System",
      role: "System Administrator",
      timestamp: nop.startDateTime ? new Date(new Date(nop.startDateTime).getTime() - 86400000).toISOString() : new Date().toISOString(),
      comment: "All technical approvals endorsed. Digital permit certificate generated."
    });
  }

  (nop.domainApprovals || []).forEach((app, idx) => {
    if (app.status === "Approved") {
      entries.push({
        id: `AUD-APP-${idx}-${nop.id}`,
        nopId: nop.id,
        action: "ENDORSE",
        actionLabel: "Technical Clearance Endorsed",
        actor: app.approvedBy || app.approverName || "Technical Approver",
        role: "Technical Approver",
        timestamp: app.decidedAt ? new Date(app.decidedAt).toISOString() : new Date().toISOString(),
        comment: `Domain clearance endorsed for ${app.domain || app.approverGroup}. ${app.comments || ""}`
      });
    }
  });

  if (nop.loPreScreenStatus === "Cleared for Approval" || nop.applicationStatus === "Approved" || (nop.domainApprovals && nop.domainApprovals.length > 0)) {
    entries.push({
      id: `AUD-PRESCREEN-${nop.id}`,
      nopId: nop.id,
      action: "PRESCREEN_CLEAR",
      actionLabel: "Pre-screening Cleared",
      actor: nop.sdcLiaisonOfficer || "SDC Liaison Officer",
      role: "Liaison Officer",
      timestamp: nop.submittedAt && nop.submittedAt.includes(" ") ? new Date(nop.submittedAt).toISOString() : "2026-09-18T14:00:00.000Z",
      comment: "Liaison Officer pre-screening verified: baseline Risk Assessment, Method Statement, and Location Plan confirmed."
    });
  } else if (nop.applicationStatus === "Change Requested") {
    entries.push({
      id: `AUD-CHANGE-REQ-${nop.id}`,
      nopId: nop.id,
      action: "PRESCREEN_CHANGE_REQUEST",
      actionLabel: "Changes Requested by LO",
      actor: nop.sdcLiaisonOfficer || "SDC Liaison Officer",
      role: "Liaison Officer",
      timestamp: "2026-09-20T16:00:00.000Z",
      comment: nop.loComments || "Incomplete documentation. Please revise and resubmit."
    });
  }

  entries.push({
    id: `AUD-SUBMIT-${nop.id}`,
    nopId: nop.id,
    action: "SUBMIT",
    actionLabel: nop.applicationStatus === "Draft" ? "Draft Saved" : "Application Submitted",
    actor: nop.applicantName || "Contractor Applicant",
    role: "Applicant (Contractor)",
    timestamp: nop.submittedAt && nop.submittedAt.includes(" ") ? new Date(nop.submittedAt).toISOString() : "2026-09-18T10:00:00.000Z",
    comment: nop.applicationStatus === "Draft" ? "Application saved as draft." : `NOP application submitted: ${nop.workDescription}`
  });

  return entries;
}

export function loadNopAuditTrail(nopId?: string): NopAuditEntry[] {
  if (typeof window === "undefined") {
    const list = nopId ? generateSeedAuditTrail(nopId) : [];
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  try {
    const raw = auditCache;
    const all: NopAuditEntry[] = raw ? JSON.parse(raw) : [];
    if (nopId) {
      const seed = generateSeedAuditTrail(nopId);
      const runtime = all.filter((e) => e.nopId.toLowerCase() === nopId.toLowerCase());
      const runtimeIds = new Set(runtime.map((r) => r.id));
      const combined = [...runtime, ...seed.filter((s) => !runtimeIds.has(s.id))];
      // CFG-05: Sort chronologically by timestamp (newest first)
      return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.error("Failed to load NOP audit trail:", err);
    const list = nopId ? generateSeedAuditTrail(nopId) : [];
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export function recordNopAudit(entry: Partial<NopAuditEntry> & { nopId: string; action: string; actor: string }): NopAuditEntry {
  const newRecord: NopAuditEntry = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    actionLabel: entry.actionLabel || entry.action,
    actorRole: entry.actorRole || entry.role || "User",
    role: entry.role || entry.actorRole || "User",
    comment: entry.comment || entry.comments || "",
    comments: entry.comments || entry.comment || "",
    ...entry
  };

  if (typeof window !== "undefined") {
    try {
      const existing = loadNopAuditTrail();
      const updated = [newRecord, ...existing];
      auditCache = JSON.stringify(updated);
    } catch (err) {
      console.error("Failed to append NOP audit record:", err);
    }
  }

  return newRecord;
}
