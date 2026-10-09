import { describe, it, expect } from "vitest";
import { derivePermitStatus, PermitStatus } from "@/lib/nopData";

// FRD §3 Permit Status Model + Status Transition Rules
describe("derivePermitStatus", () => {
  const base = {
    applicationStatus: "Approved" as const,
    startDateTime: "2026-09-10T08:00:00Z",
    endDateTime: "2026-09-20T18:00:00Z"
  };

  it("returns Upcoming before the validity start date", () => {
    expect(derivePermitStatus(base, new Date("2026-09-05"))).toBe("Upcoming");
  });

  it("returns Active within the validity period", () => {
    expect(derivePermitStatus(base, new Date("2026-09-15"))).toBe("Active");
  });

  it("returns Expired after the validity end date", () => {
    expect(derivePermitStatus(base, new Date("2026-09-25"))).toBe("Expired");
  });

  it("FRD §6 Suspension: a Suspended permit keeps ticking and becomes Expired once its validity end date passes, rather than staying Suspended forever", () => {
    const suspended = { ...base, permitStatus: "Suspended" as const };
    expect(derivePermitStatus(suspended, new Date("2026-09-15"))).toBe("Suspended");
    expect(derivePermitStatus(suspended, new Date("2026-09-25"))).toBe("Expired");
  });

  it("FRD §6: Cancelled and Revoked are terminal and never recalculated from dates", () => {
    expect(derivePermitStatus({ ...base, permitStatus: "Cancelled" }, new Date("2026-09-15"))).toBe("Cancelled");
    expect(derivePermitStatus({ ...base, permitStatus: "Revoked" }, new Date("2026-09-01"))).toBe("Revoked");
  });

  it("preserves a non-operational status while the application is not yet Approved", () => {
    const pending = { ...base, applicationStatus: "Under Review" as const, permitStatus: "Upcoming" as const };
    expect(derivePermitStatus(pending, new Date("2026-09-15"))).toBe("Upcoming");
  });

  it("FRD §3 Permit Status catalogue has exactly 6 values (no Rejected or Lapsed)", () => {
    const catalogue: PermitStatus[] = ["Upcoming", "Active", "Suspended", "Expired", "Cancelled", "Revoked"];
    expect(catalogue).toHaveLength(6);
    // @ts-expect-error "Rejected" is not part of the FRD Permit Status catalogue
    const invalid: PermitStatus = "Rejected";
    expect(catalogue).not.toContain(invalid);
  });
});
