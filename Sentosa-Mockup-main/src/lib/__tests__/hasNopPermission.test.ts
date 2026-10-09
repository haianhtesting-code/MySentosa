import { describe, it, expect } from "vitest";
import { hasNopPermission, NopPermission } from "@/lib/nopPermissions";

// FRD §2 role-to-permission matrix. Regression guard: this table encodes the
// security-sensitive boundaries that were previously found broken (most
// notably System Administrator over-granted business-action permissions).
describe("hasNopPermission — security-sensitive regression guard", () => {
  // FRD §2: "System Administrator provides technical support for the CMS
  // platform. Day-to-day NOP administration is handled by the NOP
  // Operations Admin." — view-only, no NOP business or lifecycle actions.
  describe("System Administrator", () => {
    const businessActions: NopPermission[] = [
      "nop.apply",
      "nop.approve" as NopPermission, // not even a real NopPermission value — must never be granted
      "nop.suspend_permit",
      "nop.revoke_permit",
      "nop.grant_ipa",
      "nop.config_moratorium",
      "nop.config_rules",
      "nop.prescreen",
      "nop.endorse_clearance",
      "nop.lift_suspension",
      "nop.request_revisions"
    ];
    it.each(businessActions)("must NOT have %s", (perm) => {
      expect(hasNopPermission("System Administrator", perm)).toBe(false);
    });

    it("has only nop.view_all", () => {
      expect(hasNopPermission("System Administrator", "nop.view_all")).toBe(true);
    });
  });

  describe("SDC Stakeholder / Operational Viewer (incl. OR Team)", () => {
    const mutatingActions: NopPermission[] = [
      "nop.apply",
      "nop.save_draft",
      "nop.resubmit",
      "nop.suspend_permit",
      "nop.revoke_permit",
      "nop.lift_suspension",
      "nop.grant_ipa",
      "nop.prescreen",
      "nop.clear_for_approval",
      "nop.endorse_clearance",
      "nop.request_revisions",
      "nop.config_moratorium",
      "nop.config_rules"
    ];
    it.each(mutatingActions)("must NOT have %s", (perm) => {
      expect(hasNopPermission("SDC Stakeholder / Operational Viewer (incl. OR Team)", perm)).toBe(false);
    });

    it("has read/export permissions", () => {
      expect(hasNopPermission("SDC Stakeholder / Operational Viewer (incl. OR Team)", "nop.view_all")).toBe(true);
      expect(hasNopPermission("SDC Stakeholder / Operational Viewer (incl. OR Team)", "nop.export_xlsx")).toBe(true);
      expect(hasNopPermission("SDC Stakeholder / Operational Viewer (incl. OR Team)", "nop.export_pdf")).toBe(true);
    });
  });

  describe("Applicant (Contractor)", () => {
    it("has nop.apply and nop.save_draft", () => {
      expect(hasNopPermission("Applicant (Contractor)", "nop.apply")).toBe(true);
      expect(hasNopPermission("Applicant (Contractor)", "nop.save_draft")).toBe(true);
    });

    it("does not have approver/admin permissions", () => {
      expect(hasNopPermission("Applicant (Contractor)", "nop.suspend_permit")).toBe(false);
      expect(hasNopPermission("Applicant (Contractor)", "nop.revoke_permit")).toBe(false);
      expect(hasNopPermission("Applicant (Contractor)", "nop.prescreen")).toBe(false);
      expect(hasNopPermission("Applicant (Contractor)", "nop.endorse_clearance")).toBe(false);
      expect(hasNopPermission("Applicant (Contractor)", "nop.grant_ipa")).toBe(false);
      expect(hasNopPermission("Applicant (Contractor)", "nop.config_moratorium")).toBe(false);
    });
  });

  describe("Liaison Officer", () => {
    it("has pre-screening / clearance-forwarding permissions", () => {
      expect(hasNopPermission("Liaison Officer", "nop.prescreen")).toBe(true);
      expect(hasNopPermission("Liaison Officer", "nop.request_changes")).toBe(true);
      expect(hasNopPermission("Liaison Officer", "nop.clear_for_approval")).toBe(true);
    });

    it("does not have technical-approval, suspension or permit-issuance permissions", () => {
      expect(hasNopPermission("Liaison Officer", "nop.endorse_clearance")).toBe(false);
      expect(hasNopPermission("Liaison Officer", "nop.suspend_permit")).toBe(false);
      expect(hasNopPermission("Liaison Officer", "nop.revoke_permit")).toBe(false);
      expect(hasNopPermission("Liaison Officer", "nop.grant_ipa")).toBe(false);
    });
  });

  describe("Technical Approver", () => {
    it("has domain-clearance and enforcement permissions", () => {
      expect(hasNopPermission("Technical Approver", "nop.endorse_clearance")).toBe(true);
      expect(hasNopPermission("Technical Approver", "nop.request_revisions")).toBe(true);
      expect(hasNopPermission("Technical Approver", "nop.suspend_permit")).toBe(true);
      expect(hasNopPermission("Technical Approver", "nop.revoke_permit")).toBe(true);
      expect(hasNopPermission("Technical Approver", "nop.lift_suspension")).toBe(true);
    });

    it("does not have applicant or LO pre-screening permissions", () => {
      expect(hasNopPermission("Technical Approver", "nop.apply")).toBe(false);
      expect(hasNopPermission("Technical Approver", "nop.prescreen")).toBe(false);
      expect(hasNopPermission("Technical Approver", "nop.grant_ipa")).toBe(false);
    });
  });

  describe("Duty Manager", () => {
    it("has request_ipa and view/verify permissions, but NO mutation/enforcement powers (P0-03)", () => {
      expect(hasNopPermission("Duty Manager", "nop.request_ipa")).toBe(true);
      expect(hasNopPermission("Duty Manager", "nop.grant_ipa")).toBe(false);
      expect(hasNopPermission("Duty Manager", "nop.suspend_permit")).toBe(false);
      expect(hasNopPermission("Duty Manager", "nop.revoke_permit")).toBe(false);
      expect(hasNopPermission("Duty Manager", "nop.lift_suspension")).toBe(false);
    });

    it("does not have applicant-side or admin-config permissions", () => {
      expect(hasNopPermission("Duty Manager", "nop.apply")).toBe(false);
      expect(hasNopPermission("Duty Manager", "nop.config_moratorium")).toBe(false);
      expect(hasNopPermission("Duty Manager", "nop.config_rules")).toBe(false);
    });
  });

  describe("NOP Operations Admin", () => {
    it("has the full administrative and lifecycle permission set", () => {
      const expected: NopPermission[] = [
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
      ];
      expected.forEach((perm) => expect(hasNopPermission("NOP Operations Admin", perm)).toBe(true));
    });
  });

  describe("SDC Stakeholder (alias 'Stakeholder')", () => {
    it("must not have any mutating permission", () => {
      const mutating: NopPermission[] = ["nop.apply", "nop.save_draft", "nop.suspend_permit", "nop.revoke_permit", "nop.grant_ipa"];
      mutating.forEach((perm) => expect(hasNopPermission("Stakeholder", perm)).toBe(false));
    });
  });

  describe("NOP Business Owner", () => {
    it("is view-only (plus QR verify and PDF export), no lifecycle actions", () => {
      expect(hasNopPermission("NOP Business Owner", "nop.view_all")).toBe(true);
      expect(hasNopPermission("NOP Business Owner", "nop.verify_qr")).toBe(true);
      expect(hasNopPermission("NOP Business Owner", "nop.export_pdf")).toBe(true);
      expect(hasNopPermission("NOP Business Owner", "nop.suspend_permit")).toBe(false);
      expect(hasNopPermission("NOP Business Owner", "nop.grant_ipa")).toBe(false);
      expect(hasNopPermission("NOP Business Owner", "nop.apply")).toBe(false);
    });
  });

  describe("unknown / unmapped role", () => {
    it("returns false for any permission when the role has no matrix entry", () => {
      expect(hasNopPermission("Totally Made Up Role", "nop.view_all")).toBe(false);
    });
  });
});
