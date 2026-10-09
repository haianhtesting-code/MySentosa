import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  NOPApplication,
  DomainApproval,
  resolveApprovers,
  derivePermitStatus
} from "@/lib/nopData";
import {
  canActOnDomainApproval,
  isDomainApproverForUser,
  inferDepartmentId,
  canDecideRequestWithSoD,
  hasNopPermission
} from "@/lib/nopPermissions";
import { installBrowserGlobals, uninstallBrowserGlobals } from "./testBrowserGlobals";

describe("Workflow Permissions & Demo Role Switching on NOP Detail", () => {
  beforeEach(() => {
    installBrowserGlobals();
  });

  afterEach(() => {
    uninstallBrowserGlobals();
  });

  const sampleNop: NOPApplication = {
    id: "SEN/NP/20261001/001",
    companyName: "Kim Seng Construction Pte Ltd",
    companyUen: "199801234K",
    applicantName: "David Tan",
    applicantPhone: "+65 9123 4567",
    applicantEmail: "david.tan@kimseng.sg",
    workDescription: "Excavation and landscaping works near Express Rail",
    durationCategory: "Ad-hoc Work",
    location: "Siloso Beach Walk",
    zone: "Sector 1 (North Siloso)",
    startDateTime: "2026-10-02T08:00:00+08:00",
    endDateTime: "2026-10-15T18:00:00+08:00",
    workingHours: "08:00 – 18:00",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Under Review",
    permitStatus: "Upcoming",
    ipaStatus: "N/A",
    documentCompletion: "Documents Complete",
    triggers: [
      "Excavation Work",
      "Work within Sentosa Express Corridor",
      "Tree Pruning / Felling / Landscape Works"
    ],
    documents: [],
    workers: [],
    sdcLiaisonOfficer: "Marcus Tan",
    loPreScreenStatus: "Cleared for Approval",
    domainApprovals: [
      {
        domain: "Express Rail Safety",
        approverName: "Jonathan Teo",
        approverRole: "Head, Rail Transit Safety",
        approverGroup: "Sentosa Express (Rail Operations)",
        departmentId: "express",
        status: "Pending"
      },
      {
        domain: "Precinct Operations",
        approverName: "David Lim",
        approverRole: "Operations Manager (Precinct)",
        approverGroup: "Operations (Precinct Management)",
        departmentId: "precinct",
        status: "Pending"
      },
      {
        domain: "Landscape & Arboriculture",
        approverName: "Siti Rahmah",
        approverRole: "Senior Arborist",
        approverGroup: "Landscape & Environmental Heritage",
        departmentId: "landscape",
        status: "Pending"
      }
    ],
    submittedAt: "2026-10-01 09:00"
  };

  describe("1. Department and Persona Inference (inferDepartmentId & isDomainApproverForUser)", () => {
    it("correctly infers department IDs from domains and approver groups", () => {
      expect(inferDepartmentId({ domain: "Express Rail Corridor Clearance" })).toBe("express");
      expect(inferDepartmentId({ domain: "Precinct Crowd Safety & Logistics" })).toBe("precinct");
      expect(inferDepartmentId({ approverGroup: "Operations (Precinct Management)" })).toBe("precinct");
      expect(inferDepartmentId({ approverGroup: "Landscape & Environmental Heritage" })).toBe("landscape");
      expect(inferDepartmentId({ domain: "Marine Coastal Operations" })).toBe("marine");
      expect(inferDepartmentId({ domain: "Workplace Safety & Health (WSH)" })).toBe("wsh");
    });

    it("matches Technical Approver persona and dropdown selection strictly to their own domain", () => {
      const expressStep = sampleNop.domainApprovals[0]; // express
      const precinctStep = sampleNop.domainApprovals[1]; // precinct
      const landscapeStep = sampleNop.domainApprovals[2]; // landscape

      // When demo dropdown selects express (Jonathan Teo)
      const expressUser = {
        role: "Technical Approver" as const,
        username: "Jonathan Teo",
        approverDept: "express"
      };
      expect(isDomainApproverForUser(expressStep, expressUser)).toBe(true);
      expect(isDomainApproverForUser(precinctStep, expressUser)).toBe(false);
      expect(isDomainApproverForUser(landscapeStep, expressUser)).toBe(false);

      // When demo dropdown selects precinct (David Lim)
      const precinctUser = {
        role: "Technical Approver" as const,
        username: "David Lim",
        approverDept: "precinct"
      };
      expect(isDomainApproverForUser(expressStep, precinctUser)).toBe(false);
      expect(isDomainApproverForUser(precinctStep, precinctUser)).toBe(true);
      expect(isDomainApproverForUser(landscapeStep, precinctUser)).toBe(false);

      // When demo dropdown selects landscape (Siti Rahmah)
      const landscapeUser = {
        role: "Technical Approver" as const,
        username: "Siti Rahmah",
        approverDept: "landscape"
      };
      expect(isDomainApproverForUser(landscapeStep, landscapeUser)).toBe(true);
      expect(isDomainApproverForUser(expressStep, landscapeUser)).toBe(false);
    });
  });

  describe("2. Work Involvement Approval Gating (canActOnDomainApproval)", () => {
    it("allows approval only when LO Pre-screening is 'Cleared for Approval'", () => {
      const expressStep = sampleNop.domainApprovals[0];
      const expressUser = {
        role: "Technical Approver" as const,
        username: "Jonathan Teo",
        approverDept: "express"
      };

      // When LO has cleared
      expect(canActOnDomainApproval(expressUser, sampleNop, expressStep)).toBe(true);

      // If LO has NOT cleared yet
      const unclearedNop = { ...sampleNop, loPreScreenStatus: "Pending Pre-screening" as const };
      expect(canActOnDomainApproval(expressUser, unclearedNop, expressStep)).toBe(false);
    });

    it("prevents Technical Approver of one department from endorsing another department's clearance", () => {
      const expressStep = sampleNop.domainApprovals[0]; // express
      const precinctUser = {
        role: "Technical Approver" as const,
        username: "David Lim",
        approverDept: "precinct"
      };

      // Precinct approver CANNOT endorse express step
      expect(canActOnDomainApproval(precinctUser, sampleNop, expressStep)).toBe(false);
    });

    it("allows NOP Operations Admin to endorse any domain approval", () => {
      const adminUser = {
        role: "NOP Operations Admin" as const,
        username: "Admin User",
        approverDept: ""
      };
      expect(canActOnDomainApproval(adminUser, sampleNop, sampleNop.domainApprovals[0])).toBe(true);
      expect(canActOnDomainApproval(adminUser, sampleNop, sampleNop.domainApprovals[1])).toBe(true);
    });

    it("disallows Applicant (Contractor) or Liaison Officer from endorsing domain approvals", () => {
      const contractorUser = {
        role: "Applicant (Contractor)" as const,
        username: "David Tan",
        approverDept: ""
      };
      const loUser = {
        role: "Liaison Officer" as const,
        username: "Marcus Tan",
        approverDept: ""
      };
      expect(canActOnDomainApproval(contractorUser, sampleNop, sampleNop.domainApprovals[0])).toBe(false);
      expect(canActOnDomainApproval(loUser, sampleNop, sampleNop.domainApprovals[0])).toBe(false);
    });
  });

  describe("3. Auto-Resolution of Approvers on LO Clearance", () => {
    it("resolveApprovers correctly populates approver domain and department for triggers", () => {
      const triggers = [
        "Excavation Work",
        "Work within Sentosa Express Corridor"
      ];
      const resolved = resolveApprovers(triggers);
      expect(resolved.length).toBeGreaterThanOrEqual(1);

      const expressDomain = resolved.find(d => d.departmentId === "express" || d.domain.includes("Express"));
      expect(expressDomain).toBeDefined();
      expect(expressDomain?.status).toBe("Pending");
    });
  });

  describe("4. Segregation of Duties (SoD) on Lifecycle Requests", () => {
    it("prohibits the Liaison Officer who pre-screened a request from approving it", () => {
      const extRequest = {
        id: "ext-1",
        status: "Under Approver Review" as const,
        clearedBy: "Marcus Tan",
        requestedEndDate: "2026-11-15",
        reason: "Delayed material delivery"
      };

      // Marcus Tan cleared it, so he cannot approve it
      expect(canDecideRequestWithSoD(extRequest, "Marcus Tan")).toBe(false);

      // Another user (e.g. Tan Kian Seng or Duty Manager) CAN approve it
      expect(canDecideRequestWithSoD(extRequest, "Tan Kian Seng")).toBe(true);
    });
  });
});
