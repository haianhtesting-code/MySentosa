import { describe, it, expect } from "vitest";
import { validateExtensionRequest } from "@/lib/nopData";

// FRD §6 NOP Extension
describe("validateExtensionRequest", () => {
  const now = new Date("2026-09-15");
  const nop = {
    applicationStatus: "Approved" as const,
    permitStatus: "Active" as const,
    startDateTime: "2026-09-01T08:00:00Z",
    endDateTime: "2026-09-20T18:00:00Z",
    extensionRequests: [] as any[]
  };

  it("accepts a request within 1 month of the current end date", () => {
    expect(validateExtensionRequest(nop, "2026-10-10", now)).toEqual({ valid: true });
  });

  it("rejects a requested end date on or before the current end date", () => {
    const result = validateExtensionRequest(nop, "2026-09-18", now);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/after the current permit expiration date/);
  });

  it("rejects a requested end date beyond 1 month past the current end date", () => {
    const result = validateExtensionRequest(nop, "2026-10-25", now);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/cannot exceed 1 month/);
  });

  it("FRD: each NOP is eligible for one extension — blocks a second request once one is Approved", () => {
    const withApproved = { ...nop, extensionRequests: [{ id: "1", requestedEndDate: "2026-10-01", reason: "r", status: "Approved" as const, requestedAt: now.toISOString() }] };
    const result = validateExtensionRequest(withApproved, "2026-10-15", now);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/only be extended once/);
  });

  it("blocks a new request while one is already pending review", () => {
    const withPending = { ...nop, extensionRequests: [{ id: "1", requestedEndDate: "2026-10-01", reason: "r", status: "Pending Pre-screening" as const, requestedAt: now.toISOString() }] };
    const result = validateExtensionRequest(withPending, "2026-10-15", now);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/already pending review/);
  });

  it("allows a new request after a prior one was Rejected (rejection does not consume the one-time entitlement)", () => {
    const withRejected = { ...nop, extensionRequests: [{ id: "1", requestedEndDate: "2026-10-01", reason: "r", status: "Rejected" as const, requestedAt: now.toISOString() }] };
    expect(validateExtensionRequest(withRejected, "2026-10-10", now)).toEqual({ valid: true });
  });

  it("FRD: extension must be requested before the permit's validity period expires", () => {
    const alreadyExpired = { ...nop, startDateTime: "2026-08-01T08:00:00Z", endDateTime: "2026-09-01T18:00:00Z" };
    const result = validateExtensionRequest(alreadyExpired, "2026-09-20", now);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/before the permit's validity period expires/);
  });
});
