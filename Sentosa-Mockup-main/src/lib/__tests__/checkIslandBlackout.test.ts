import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { checkIslandBlackout, saveStoredBlackouts, BlackoutDateConfig } from "@/lib/nopData";
import { installBrowserGlobals, uninstallBrowserGlobals } from "./testBrowserGlobals";

// FRD §6.4 / T23 Automatic Blackout Engine: merges hardcoded weekend/public
// holiday checks with admin-configured loadStoredBlackouts() entries,
// matching by date range AND zone.
describe("checkIslandBlackout", () => {
  beforeEach(() => {
    installBrowserGlobals();
  });
  afterEach(() => {
    uninstallBrowserGlobals();
  });

  it("flags a Saturday as a weekend-only blackout with no admin overlap", () => {
    // 2026-09-19 is a Saturday.
    const result = checkIslandBlackout("2026-09-19", "Sector 1 (North Siloso)");
    expect(result.isBlackout).toBe(true);
    expect(result.isWeekend).toBe(true);
    expect(result.isHoliday).toBeFalsy();
    expect(result.reason).toMatch(/Island-Wide Weekend Blackout/);
  });

  it("flags a Sunday as a weekend-only blackout", () => {
    // 2026-09-20 is a Sunday.
    const result = checkIslandBlackout("2026-09-20");
    expect(result.isBlackout).toBe(true);
    expect(result.isWeekend).toBe(true);
  });

  it("flags a Singapore public holiday (weekday) as a holiday-only blackout", () => {
    // 2026-05-01 (Labour Day) is a Friday — holiday, not weekend.
    const result = checkIslandBlackout("2026-05-01");
    expect(result.isBlackout).toBe(true);
    expect(result.isHoliday).toBe(true);
    expect(result.isWeekend).toBe(false);
    expect(result.reason).toMatch(/Singapore Public Holiday: Labour Day/);
  });

  it("flags an admin-configured blackout on an ordinary weekday with a matching zone (admin-configured-only)", () => {
    // 2026-09-16 is a Wednesday — no weekend/holiday overlap.
    const configs: BlackoutDateConfig[] = [
      {
        id: "BO-TEST-01",
        name: "Test Festival Closure",
        startDate: "2026-09-15",
        endDate: "2026-09-18",
        zones: ["Siloso Beach Sector 1"],
        restrictionLevel: "Total Blackout",
        status: "Active"
      }
    ];
    saveStoredBlackouts(configs);
    const result = checkIslandBlackout("2026-09-16", "Siloso Beach Sector 1");
    expect(result.isBlackout).toBe(true);
    expect(result.isWeekend).toBeFalsy();
    expect(result.isHoliday).toBeFalsy();
    expect(result.reason).toMatch(/Test Festival Closure/);
  });

  it("matches an exact zone string", () => {
    saveStoredBlackouts([
      { id: "BO-1", name: "Exact Zone Blackout", startDate: "2026-09-16", endDate: "2026-09-16", zones: ["Imbiah Hill"], restrictionLevel: "Total Blackout", status: "Active" }
    ]);
    expect(checkIslandBlackout("2026-09-16", "Imbiah Hill").isBlackout).toBe(true);
  });

  it("matches via a case-insensitive substring in either direction", () => {
    saveStoredBlackouts([
      { id: "BO-2", name: "Substring Blackout", startDate: "2026-09-16", endDate: "2026-09-16", zones: ["Siloso Beach Sector 1"], restrictionLevel: "Total Blackout", status: "Active" }
    ]);
    // Config zone contains the queried zone as a substring.
    expect(checkIslandBlackout("2026-09-16", "Siloso Beach").isBlackout).toBe(true);
    // Queried zone contains the config zone as a substring.
    expect(checkIslandBlackout("2026-09-16", "North Siloso Beach Sector 1 Extension").isBlackout).toBe(true);
  });

  it("'All Island Precincts' wildcard matches any zone, including an empty one", () => {
    saveStoredBlackouts([
      { id: "BO-3", name: "Island-Wide Advisory", startDate: "2026-09-16", endDate: "2026-09-16", zones: ["All Island Precincts"], restrictionLevel: "No Heavy Machinery", status: "Active" }
    ]);
    expect(checkIslandBlackout("2026-09-16", "Any Random Zone").isBlackout).toBe(true);
    expect(checkIslandBlackout("2026-09-16").isBlackout).toBe(true);
  });

  it("a non-matching zone on a date within range does not trigger a blackout", () => {
    saveStoredBlackouts([
      { id: "BO-4", name: "Localised Closure", startDate: "2026-09-16", endDate: "2026-09-16", zones: ["Palawan Beach Boardwalk"], restrictionLevel: "Total Blackout", status: "Active" }
    ]);
    const result = checkIslandBlackout("2026-09-16", "Gateway Corridor");
    expect(result.isBlackout).toBe(false);
  });

  it("returns isBlackout: false when there is no overlap of any kind (weekday, no holiday, no admin config match)", () => {
    saveStoredBlackouts([
      { id: "BO-5", name: "Unrelated Window", startDate: "2026-11-01", endDate: "2026-11-05", zones: ["Gateway Corridor"], restrictionLevel: "Total Blackout", status: "Active" }
    ]);
    // 2026-09-16 is a Wednesday, not a holiday, and outside the configured window/zone.
    const result = checkIslandBlackout("2026-09-16", "Siloso Beach Walkway");
    expect(result).toEqual({ isBlackout: false });
  });
});
