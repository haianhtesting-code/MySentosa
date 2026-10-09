import { describe, it, expect } from "vitest";
import { STATUTORY_TRIGGERS_LIST } from "@/lib/nopData";

// Regression guard for two previously-fixed exact-wording bugs in the
// statutory Work Involvement triggers catalogue (must match FRD verbatim).
describe("STATUTORY_TRIGGERS_LIST", () => {
  it("has exactly 14 entries (the current FRD statutory trigger count)", () => {
    expect(STATUTORY_TRIGGERS_LIST).toHaveLength(14);
  });

  it("the single SDC-managed location trigger includes the exclusion clause for Island Partner premises, Sentosa Golf Club and Sentosa Cove", () => {
    expect(STATUTORY_TRIGGERS_LIST).toContain(
      "Works requiring more than 1 hour at a single SDC-managed location, excluding Island Partner premises, Sentosa Golf Club and Sentosa Cove"
    );
  });

  it("the tree-removal trigger is exactly 'Removal of trees with a girth exceeding 1 metre' with no added protection-zone scope", () => {
    expect(STATUTORY_TRIGGERS_LIST).toContain("Removal of trees with a girth exceeding 1 metre");
    // Regression guard: an earlier bug appended "protection zone" wording to this trigger.
    expect(STATUTORY_TRIGGERS_LIST.some((t) => t.includes("Removal of trees") && t.includes("protection zone"))).toBe(false);
  });

  it("contains no duplicate entries", () => {
    expect(new Set(STATUTORY_TRIGGERS_LIST).size).toBe(STATUTORY_TRIGGERS_LIST.length);
  });
});
