import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isDeferrableWhenUrgent, saveStoredUrgentDocClassification, SUPPORTING_DOCUMENT_SCHEDULE } from "@/lib/nopData";
import { installBrowserGlobals, uninstallBrowserGlobals } from "./testBrowserGlobals";

// FRD §4.2 Urgent NOP Classification (WEB-21): "shall be able to configure
// which supporting-document categories remain mandatory for the initial
// Urgent NOP submission." isDeferrableWhenUrgent prefers an admin-configured
// override, falling back to the hardcoded schedule default when unset.
describe("isDeferrableWhenUrgent", () => {
  beforeEach(() => {
    installBrowserGlobals();
  });
  afterEach(() => {
    uninstallBrowserGlobals();
  });

  it("returns the schedule's hardcoded default (true) when nothing is stored", () => {
    const scheduleDoc = SUPPORTING_DOCUMENT_SCHEDULE.find((d) => d.id === "doc-scaff");
    expect(scheduleDoc?.deferrableWhenUrgent).toBe(true);
    expect(isDeferrableWhenUrgent("doc-scaff")).toBe(true);
  });

  it("returns the schedule's hardcoded default (false) when nothing is stored", () => {
    const scheduleDoc = SUPPORTING_DOCUMENT_SCHEDULE.find((d) => d.id === "doc-tmp");
    expect(scheduleDoc?.deferrableWhenUrgent).toBe(false);
    expect(isDeferrableWhenUrgent("doc-tmp")).toBe(false);
  });

  it("a stored override flips a normally-deferrable doc to non-deferrable", () => {
    saveStoredUrgentDocClassification({ "doc-scaff": false });
    expect(isDeferrableWhenUrgent("doc-scaff")).toBe(false);
  });

  it("a stored override flips a normally-non-deferrable doc to deferrable", () => {
    saveStoredUrgentDocClassification({ "doc-tmp": true });
    expect(isDeferrableWhenUrgent("doc-tmp")).toBe(true);
  });

  it("a doc id with no stored override and no schedule entry falls back to false", () => {
    expect(isDeferrableWhenUrgent("doc-does-not-exist")).toBe(false);
  });
});
