import { describe, it, expect } from "vitest";
import { SUPPORTING_DOCUMENT_SCHEDULE, getApplicableConditionalDocs } from "@/lib/nopData";

// FRD §4 Attachment Upload Rules / Supporting Document Schedule
describe("SUPPORTING_DOCUMENT_SCHEDULE categories", () => {
  it("Baseline documents (RA, MOS, Location Plan) are mandatory for ALL applications regardless of triggers", () => {
    const baselineIds = SUPPORTING_DOCUMENT_SCHEDULE.filter((d) => d.category === "Baseline").map((d) => d.id);
    expect(baselineIds).toEqual(expect.arrayContaining(["doc-ra", "doc-mos", "doc-loc"]));
    // Baseline documents are never deferrable, per the schedule's own doc comment.
    SUPPORTING_DOCUMENT_SCHEDULE.filter((d) => d.category === "Baseline").forEach((d) => {
      expect(d.deferrableWhenUrgent).toBeFalsy();
    });
  });
});

describe("getApplicableConditionalDocs", () => {
  it("returns nothing when no triggers are selected", () => {
    expect(getApplicableConditionalDocs([])).toEqual([]);
  });

  it("a Conditional doc appears only when its requiredForTrigger substring matches a selected trigger", () => {
    const docs = getApplicableConditionalDocs(["Works requiring partial or full closure of a lane or road (TMP Mandatory)"]);
    const ids = docs.map((d) => d.id);
    expect(ids).toContain("doc-tmp");
    expect(ids).toContain("doc-stakeholder-coord");
    // Unrelated conditional docs (e.g. seafront works) must not appear.
    expect(ids).not.toContain("doc-seafront");
  });

  it("a Conditional doc for a trigger not selected does not appear", () => {
    const docs = getApplicableConditionalDocs(["Temporary Works Along the Seafront"]);
    const ids = docs.map((d) => d.id);
    expect(ids).toContain("doc-seafront");
    expect(ids).not.toContain("doc-tmp");
  });

  it("SUB-01: PE Scaffolding Calculation is triggered when Working at Height and scaffolding is involved", () => {
    const withoutScaff = getApplicableConditionalDocs(["Working at Height Above 30 Metres"], undefined, false);
    expect(withoutScaff.map((d) => d.id)).not.toContain("doc-scaff");

    const withScaff = getApplicableConditionalDocs(["Working at Height Above 30 Metres"], undefined, true);
    expect(withScaff.map((d) => d.id)).toContain("doc-scaff");
  });

  it("SUB-02: Lifting Plan is triggered when liftingOperations is true", () => {
    const withoutLifting = getApplicableConditionalDocs([], undefined, false, false);
    expect(withoutLifting.map((d) => d.id)).not.toContain("doc-crane");

    const withLifting = getApplicableConditionalDocs([], undefined, false, true);
    expect(withLifting.map((d) => d.id)).toContain("doc-crane");
  });

  it("the excavation-depth-gated doc (doc-geotech, minExcavationDepthMetres: 6) only appears when depth exceeds the threshold", () => {
    const shallow = getApplicableConditionalDocs(["Excavation Work"], 5);
    expect(shallow.map((d) => d.id)).not.toContain("doc-geotech");
    // The plain C&S PE doc has no depth gate and is required whenever Excavation Work is selected.
    expect(shallow.map((d) => d.id)).toContain("doc-cspe");

    const deep = getApplicableConditionalDocs(["Excavation Work"], 7);
    expect(deep.map((d) => d.id)).toContain("doc-geotech");
    expect(deep.map((d) => d.id)).toContain("doc-cspe");
  });

  it("omitting excavation depth entirely excludes the depth-gated doc", () => {
    const docs = getApplicableConditionalDocs(["Excavation Work"]);
    expect(docs.map((d) => d.id)).not.toContain("doc-geotech");
  });

  it("never returns Baseline or Optional documents, even across a broad trigger set (function is scoped to Conditional docs only)", () => {
    const allTriggers = [
      "Works requiring partial or full closure of a lane or road (TMP Mandatory)",
      "Excavation Work",
      "Retaining Wall Work",
      "Temporary Works Along the Seafront",
      "High-Risk Work, Equipment and Vehicles",
      "scaffolding",
      "Lifting operations",
      "slopes"
    ];
    const docs = getApplicableConditionalDocs(allTriggers, 10);
    expect(docs.every((d) => d.category === "Conditional")).toBe(true);
    const ids = docs.map((d) => d.id);
    expect(ids).not.toContain("doc-pli");
    expect(ids).not.toContain("doc-ra");
  });
});
