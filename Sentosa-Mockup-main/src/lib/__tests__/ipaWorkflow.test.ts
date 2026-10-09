import { describe, it, expect } from "vitest";
import { calculateDocumentDeadline } from "@/lib/nopData";

// FRD §6 Urgent NOP Document Completion: "The system calculates the
// document-completion deadline from the date and time IPA is granted, using
// the configured number of continuous 24-hour calendar days."
describe("calculateDocumentDeadline", () => {
  it("adds the configured number of continuous 24-hour days to the IPA grant time", () => {
    const granted = "2026-09-17T10:00:00.000Z";
    const deadline = calculateDocumentDeadline(granted, 3);
    expect(new Date(deadline).getTime() - new Date(granted).getTime()).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it("defaults to 3 continuous days when no period is configured", () => {
    const granted = "2026-09-17T10:00:00.000Z";
    const deadline = calculateDocumentDeadline(granted);
    expect(new Date(deadline).getTime() - new Date(granted).getTime()).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it("respects a different configured period (e.g. 5 continuous days)", () => {
    const granted = "2026-09-17T10:00:00.000Z";
    const deadline = calculateDocumentDeadline(granted, 5);
    expect(new Date(deadline).getTime() - new Date(granted).getTime()).toBe(5 * 24 * 60 * 60 * 1000);
  });
});
