import { describe, it, expect } from "vitest";
import { classifyAmendment, resetApprovalsForResubmission, DomainApproval } from "@/lib/nopData";

const original = {
  workDescription: "Timber decking renewal",
  startDateTime: "2026-09-17T08:00:00Z",
  endDateTime: "2026-09-24T18:00:00Z",
  location: "Palawan Beach Boardwalk",
  zone: "Sector 2 (South Beach)"
};

// FRD §5 Routing on Resubmission
describe("classifyAmendment", () => {
  it("classifies a change to scope of works as Critical", () => {
    expect(classifyAmendment(original, { workDescription: "Full structural replacement" })).toBe("Critical");
  });

  it("classifies a change to work dates as Critical", () => {
    expect(classifyAmendment(original, { endDateTime: "2026-10-01T18:00:00Z" })).toBe("Critical");
  });

  it("classifies a change to the area of works (location/zone) as Critical", () => {
    expect(classifyAmendment(original, { zone: "Sector 3 (Palawan Beach)" })).toBe("Critical");
  });

  it("classifies no change to scope/dates/area as Minor (e.g. worker list additions)", () => {
    expect(classifyAmendment(original, {})).toBe("Minor");
  });

  it("does not treat an unchanged value passed through as an amendment", () => {
    expect(classifyAmendment(original, { workDescription: original.workDescription })).toBe("Minor");
  });
});

describe("resetApprovalsForResubmission", () => {
  const approvals: DomainApproval[] = [
    { domain: "A", approverName: "Alice", approverRole: "Approver", status: "Approved" },
    { domain: "B", approverName: "Bob", approverRole: "Approver", status: "Change Requested" },
    { domain: "C", approverName: "Carol", approverRole: "Approver", status: "Pending" }
  ];

  it("FRD: Minor amendment retains already-Approved decisions untouched", () => {
    const result = resetApprovalsForResubmission(approvals, "Minor");
    expect(result.find((a) => a.domain === "A")?.status).toBe("Approved");
  });

  it("FRD: Critical amendment routes previously-Approved steps back to Pending for re-approval", () => {
    const result = resetApprovalsForResubmission(approvals, "Critical");
    expect(result.find((a) => a.domain === "A")?.status).toBe("Pending");
  });

  it("a step that previously requested changes always returns to Pending, regardless of classification", () => {
    const minorResult = resetApprovalsForResubmission(approvals, "Minor");
    const criticalResult = resetApprovalsForResubmission(approvals, "Critical");
    expect(minorResult.find((a) => a.domain === "B")?.status).toBe("Pending");
    expect(criticalResult.find((a) => a.domain === "B")?.status).toBe("Pending");
  });

  it("a step already Pending is left as Pending either way", () => {
    const result = resetApprovalsForResubmission(approvals, "Critical");
    expect(result.find((a) => a.domain === "C")?.status).toBe("Pending");
  });
});
