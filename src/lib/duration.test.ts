import { describe, expect, it } from "vitest";
import { durationMessage } from "./duration";

describe("durationMessage", () => {
  it("uses hours for a short same-day tour", () => {
    expect(durationMessage({ durationDays: 1, durationHours: 2 })).toEqual({
      key: "hours",
      count: 2,
    });
  });

  it("falls back to days when no hours are set", () => {
    expect(durationMessage({ durationDays: 1, durationHours: null })).toEqual({
      key: "days",
      count: 1,
    });
    expect(durationMessage({ durationDays: 3, durationHours: null })).toEqual({
      key: "days",
      count: 3,
    });
  });
});
