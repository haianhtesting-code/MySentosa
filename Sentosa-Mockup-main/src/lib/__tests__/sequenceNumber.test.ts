import { describe, it, expect } from "vitest";
import { generateNopSequenceNumber, NOPApplication } from "@/lib/nopData";

function makeStub(id: string): NOPApplication {
  return { id } as unknown as NOPApplication;
}

// FRD §3 NOP Reference Number: "NNN: Sequential counter, zero-padded to
// three digits and reset daily." Derived from the highest existing NNN
// issued that day, not the total record count.
describe("generateNopSequenceNumber", () => {
  it("returns 001 for a brand-new date prefix with no existing records", () => {
    expect(generateNopSequenceNumber([], "20260922")).toBe("001");
  });

  it("increments based on the highest existing same-day sequence number", () => {
    const nops = [makeStub("SEN/NP/20260922/001"), makeStub("SEN/NP/20260922/002")];
    expect(generateNopSequenceNumber(nops, "20260922")).toBe("003");
  });

  it("does not simply use record count — a gap (deleted record) still yields the next number after the highest surviving one", () => {
    const nops = [makeStub("SEN/NP/20260922/001"), makeStub("SEN/NP/20260922/005")];
    expect(generateNopSequenceNumber(nops, "20260922")).toBe("006");
  });

  it("resets to 001 for a different date prefix even when other dates have records", () => {
    const nops = [makeStub("SEN/NP/20260921/001"), makeStub("SEN/NP/20260921/002"), makeStub("SEN/NP/20260921/003")];
    expect(generateNopSequenceNumber(nops, "20260922")).toBe("001");
  });

  it("zero-pads to 3 digits past double digits", () => {
    const nops = Array.from({ length: 9 }, (_, i) => makeStub(`SEN/NP/20260922/${String(i + 1).padStart(3, "0")}`));
    expect(generateNopSequenceNumber(nops, "20260922")).toBe("010");
  });

  it("respects a suffixPrefix (e.g. DRAFT-) as a separate counter namespace from issued numbers", () => {
    const nops = [makeStub("SEN/NP/20260922/001"), makeStub("SEN/NP/20260922/DRAFT-001")];
    expect(generateNopSequenceNumber(nops, "20260922", "DRAFT-")).toBe("002");
    expect(generateNopSequenceNumber(nops, "20260922")).toBe("002");
  });
});
