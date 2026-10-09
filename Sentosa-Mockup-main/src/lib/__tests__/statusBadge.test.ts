import { describe, it, expect } from "vitest";
import { getEffectiveStatusBadgeProps } from "@/lib/nopData";

// FRD: Permit Status only exists once a NOP has been issued (Application
// Status = Approved). A Draft/Under Review/Change Requested/Withdrawn
// application must never display an operational permit badge — every
// surface shall show the application's lifecycle stage instead.
describe("getEffectiveStatusBadgeProps", () => {
  it("Draft applicationStatus shows a Draft lifecycle badge, not a permit badge", () => {
    const result = getEffectiveStatusBadgeProps({
      applicationStatus: "Draft",
      permitStatus: "Upcoming",
      startDateTime: "3000-01-01T08:00:00Z",
      endDateTime: "3000-01-10T18:00:00Z"
    });
    expect(result).toEqual({ label: "Draft", className: "badge-permit-upcoming", dotColor: "#64748B" });
  });

  it("Under Review applicationStatus shows an Under Review lifecycle badge", () => {
    const result = getEffectiveStatusBadgeProps({
      applicationStatus: "Under Review",
      permitStatus: "Upcoming",
      startDateTime: "3000-01-01T08:00:00Z",
      endDateTime: "3000-01-10T18:00:00Z"
    });
    expect(result).toEqual({ label: "Under Review", className: "badge-permit-upcoming", dotColor: "#3B82F6" });
  });

  it("Change Requested applicationStatus shows a Change Requested lifecycle badge", () => {
    const result = getEffectiveStatusBadgeProps({
      applicationStatus: "Change Requested",
      permitStatus: "Upcoming",
      startDateTime: "3000-01-01T08:00:00Z",
      endDateTime: "3000-01-10T18:00:00Z"
    });
    expect(result).toEqual({ label: "Change Requested", className: "badge-permit-suspended", dotColor: "#F59E0B" });
  });

  it("Withdrawn applicationStatus shows a Withdrawn lifecycle badge", () => {
    const result = getEffectiveStatusBadgeProps({
      applicationStatus: "Withdrawn",
      permitStatus: "Cancelled",
      startDateTime: "3000-01-01T08:00:00Z",
      endDateTime: "3000-01-10T18:00:00Z"
    });
    expect(result).toEqual({ label: "Withdrawn", className: "badge-permit-cancelled", dotColor: "#64748B" });
  });

  // Approved falls through to derivePermitStatus-based operational status.
  // Dates use far past/future bounds so the result is independent of the
  // machine's real wall-clock time (the function has no injectable `now`).
  it("Approved + validity window spanning far past to far future derives Active", () => {
    const result = getEffectiveStatusBadgeProps({
      applicationStatus: "Approved",
      permitStatus: "Upcoming",
      startDateTime: "2000-01-01T08:00:00Z",
      endDateTime: "3000-01-01T18:00:00Z"
    });
    expect(result).toEqual({ label: "Active", className: "badge-permit-active", dotColor: "#10B981" });
  });

  it("Approved + validity window entirely in the future derives Upcoming", () => {
    const result = getEffectiveStatusBadgeProps({
      applicationStatus: "Approved",
      permitStatus: "Upcoming",
      startDateTime: "3000-01-01T08:00:00Z",
      endDateTime: "3000-01-10T18:00:00Z"
    });
    expect(result).toEqual({ label: "Upcoming", className: "badge-permit-upcoming", dotColor: "#3B82F6" });
  });

  it("Approved + validity window entirely in the past derives Expired", () => {
    const result = getEffectiveStatusBadgeProps({
      applicationStatus: "Approved",
      permitStatus: "Active",
      startDateTime: "2000-01-01T08:00:00Z",
      endDateTime: "2000-01-10T18:00:00Z"
    });
    expect(result).toEqual({ label: "Expired", className: "badge-permit-expired", dotColor: "#64748B" });
  });

  it("Approved + terminal Cancelled permitStatus stays Cancelled regardless of dates", () => {
    const result = getEffectiveStatusBadgeProps({
      applicationStatus: "Approved",
      permitStatus: "Cancelled",
      startDateTime: "2000-01-01T08:00:00Z",
      endDateTime: "3000-01-10T18:00:00Z"
    });
    expect(result).toEqual({ label: "Cancelled", className: "badge-permit-cancelled", dotColor: "#F59E0B" });
  });

  it("Approved + terminal Revoked permitStatus stays Revoked regardless of dates", () => {
    const result = getEffectiveStatusBadgeProps({
      applicationStatus: "Approved",
      permitStatus: "Revoked",
      startDateTime: "2000-01-01T08:00:00Z",
      endDateTime: "3000-01-10T18:00:00Z"
    });
    expect(result).toEqual({ label: "Revoked", className: "badge-permit-revoked", dotColor: "#E11D48" });
  });
});
