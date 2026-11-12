import { describe, expect, it } from "vitest";
import { getAuditDateBounds } from "./utils.js";

describe("getAuditDateBounds", () => {
  const now = new Date("2025-03-12T10:00:00.000Z");

  it("uses the selected shift timezone for today, yesterday, and this week", () => {
    expect(getAuditDateBounds("TODAY", "Asia/Ho_Chi_Minh", now)).toEqual({
      startAt: "2025-03-11T17:00:00.000Z",
      endAt: "2025-03-12T17:00:00.000Z",
    });
    expect(getAuditDateBounds("YESTERDAY", "Asia/Ho_Chi_Minh", now)).toEqual({
      startAt: "2025-03-10T17:00:00.000Z",
      endAt: "2025-03-11T17:00:00.000Z",
    });
    expect(getAuditDateBounds("THIS_WEEK", "Asia/Ho_Chi_Minh", now)).toEqual({
      startAt: "2025-03-09T17:00:00.000Z",
      endAt: "2025-03-12T17:00:00.000Z",
    });
  });

  it("includes both custom calendar dates in the selected timezone", () => {
    expect(
      getAuditDateBounds(
        "CUSTOM",
        "Asia/Ho_Chi_Minh",
        now,
        "2025-03-09",
        "2025-03-10",
      ),
    ).toEqual({
      startAt: "2025-03-08T17:00:00.000Z",
      endAt: "2025-03-10T17:00:00.000Z",
    });
  });

  it("rejects incomplete or inverted custom ranges", () => {
    expect(
      getAuditDateBounds("CUSTOM", "Asia/Ho_Chi_Minh", now, "2025-03-10"),
    ).toBeNull();
    expect(
      getAuditDateBounds(
        "CUSTOM",
        "Asia/Ho_Chi_Minh",
        now,
        "2025-03-11",
        "2025-03-10",
      ),
    ).toBeNull();
  });
});
