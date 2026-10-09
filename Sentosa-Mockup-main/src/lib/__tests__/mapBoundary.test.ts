import { describe, it, expect } from "vitest";
import {
  getActiveMapNops,
  projectLatLngToSvg,
  boundaryToSvgPoints,
  SENTOSA_MAP_BOUNDS,
  NOPApplication
} from "@/lib/nopData";

const VIEW_BOX = { width: 1000, height: 600 };

function makeNop(overrides: Partial<NOPApplication>): NOPApplication {
  return {
    id: "SEN/NP/20260101/001",
    companyName: "Test Co",
    companyUen: "199801234K",
    applicantName: "Test Applicant",
    applicantPhone: "+65 9123 4567",
    applicantEmail: "a@b.com",
    workDescription: "Test work",
    durationCategory: "Ad-hoc Work",
    location: "Test location",
    zone: "Sector 1 (North Siloso)",
    startDateTime: "2026-09-01T08:00:00Z",
    endDateTime: "2026-09-30T18:00:00Z",
    workingHours: "08:00 - 18:00",
    isUrgent: false,
    hasBlackoutOverlap: false,
    applicationStatus: "Approved",
    permitStatus: "Active",
    triggers: [],
    documents: [],
    domainApprovals: [],
    workersList: [],
    ...overrides
  } as unknown as NOPApplication;
}

// FRD §9 UCS Map View
describe("getActiveMapNops", () => {
  const now = new Date("2026-09-15");
  const boundary = [
    { lat: 1.248, lng: 103.82 },
    { lat: 1.249, lng: 103.821 },
    { lat: 1.2475, lng: 103.822 }
  ];

  it("includes only NOPs with a derived Active validity state", () => {
    const nops = [
      makeNop({ id: "A", permitStatus: "Active", boundaryCoordinates: boundary }),
      makeNop({ id: "B", permitStatus: "Upcoming", startDateTime: "2026-10-01T08:00:00Z", endDateTime: "2026-10-10T18:00:00Z", boundaryCoordinates: boundary }),
      makeNop({ id: "C", permitStatus: "Suspended", boundaryCoordinates: boundary }),
      makeNop({ id: "D", permitStatus: "Expired", startDateTime: "2026-08-01T08:00:00Z", endDateTime: "2026-08-10T18:00:00Z", boundaryCoordinates: boundary }),
      makeNop({ id: "E", permitStatus: "Cancelled", boundaryCoordinates: boundary }),
      makeNop({ id: "F", permitStatus: "Revoked", boundaryCoordinates: boundary })
    ];
    const result = getActiveMapNops(nops, now).map((n) => n.id);
    expect(result).toEqual(["A"]);
  });

  it("excludes an Active-status NOP that has no recorded work boundary", () => {
    const nops = [makeNop({ id: "NO-BOUNDARY", permitStatus: "Active", boundaryCoordinates: undefined })];
    expect(getActiveMapNops(nops, now)).toHaveLength(0);
  });

  it("excludes a boundary with fewer than 3 points (not a valid polygon)", () => {
    const nops = [makeNop({ id: "LINE", permitStatus: "Active", boundaryCoordinates: [boundary[0], boundary[1]] })];
    expect(getActiveMapNops(nops, now)).toHaveLength(0);
  });
});

describe("projectLatLngToSvg", () => {
  it("maps the bounds' corners to the view box's corners", () => {
    const bottomLeft = projectLatLngToSvg({ lat: SENTOSA_MAP_BOUNDS.minLat, lng: SENTOSA_MAP_BOUNDS.minLng }, SENTOSA_MAP_BOUNDS, VIEW_BOX);
    expect(bottomLeft.x).toBeCloseTo(0);
    expect(bottomLeft.y).toBeCloseTo(VIEW_BOX.height);

    const topRight = projectLatLngToSvg({ lat: SENTOSA_MAP_BOUNDS.maxLat, lng: SENTOSA_MAP_BOUNDS.maxLng }, SENTOSA_MAP_BOUNDS, VIEW_BOX);
    expect(topRight.x).toBeCloseTo(VIEW_BOX.width);
    expect(topRight.y).toBeCloseTo(0);
  });

  it("increasing latitude decreases the SVG y coordinate (north is up)", () => {
    const south = projectLatLngToSvg({ lat: SENTOSA_MAP_BOUNDS.minLat, lng: 103.82 }, SENTOSA_MAP_BOUNDS, VIEW_BOX);
    const north = projectLatLngToSvg({ lat: SENTOSA_MAP_BOUNDS.maxLat, lng: 103.82 }, SENTOSA_MAP_BOUNDS, VIEW_BOX);
    expect(north.y).toBeLessThan(south.y);
  });
});

describe("boundaryToSvgPoints", () => {
  it("produces one 'x,y' pair per boundary point, space-separated", () => {
    const boundary = [
      { lat: 1.248, lng: 103.82 },
      { lat: 1.249, lng: 103.821 },
      { lat: 1.2475, lng: 103.822 }
    ];
    const result = boundaryToSvgPoints(boundary, SENTOSA_MAP_BOUNDS, VIEW_BOX);
    expect(result.split(" ")).toHaveLength(3);
    result.split(" ").forEach((pair) => expect(pair).toMatch(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/));
  });
});
