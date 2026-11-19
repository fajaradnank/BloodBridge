import { describe, it, expect } from "vitest";
import { normalizeStatus, timeAgo, typeLabel } from "./adminUtils";

const NOW = 1700000000000;
const secondsAgo = (s) => ({ seconds: NOW / 1000 - s });

describe("timeAgo", () => {
  it("formats minutes, hours and days like wireframe A01", () => {
    expect(timeAgo(secondsAgo(5 * 60), NOW)).toBe("5 min ago");
    expect(timeAgo(secondsAgo(3 * 3600), NOW)).toBe("3 hrs ago");
    expect(timeAgo(secondsAgo(86400), NOW)).toBe("1 day ago");
    expect(timeAgo(secondsAgo(2 * 86400), NOW)).toBe("2 days ago");
  });
  it("returns an empty string when there is no date", () => {
    expect(timeAgo(undefined, NOW)).toBe("");
  });
});

describe("normalizeStatus / typeLabel", () => {
  it("maps SRS and lowercase statuses", () => {
    expect(normalizeStatus("Pending Approval")).toBe("pending");
    expect(normalizeStatus("pending")).toBe("pending");
    expect(normalizeStatus("Approved")).toBe("approved");
    expect(normalizeStatus("rejected")).toBe("rejected");
  });
  it("labels organization types", () => {
    expect(typeLabel("blood bank")).toBe("Blood bank");
    expect(typeLabel("hospital")).toBe("Hospital");
  });
});