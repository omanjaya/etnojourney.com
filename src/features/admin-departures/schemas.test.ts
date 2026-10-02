import { describe, expect, it } from "vitest";
import {
  assignGuideSchema,
  departureNoteSchema,
  parseDepartureParams,
  parseDepartureQuery,
} from "./schemas";

const today = "2026-10-02";

describe("parseDepartureQuery", () => {
  it("defaults to the next 30 days without filters", () => {
    expect(parseDepartureQuery({}, today)).toEqual({
      from: "2026-10-02",
      to: "2026-11-01",
      tourId: undefined,
      withoutGuide: false,
      custom: false,
    });
  });

  it("reads a range, tour and the without-guide flag", () => {
    expect(
      parseDepartureQuery({ from: "2026-10-02", to: "2026-10-08", tour: "4", noGuide: "1" }, today),
    ).toEqual({
      from: "2026-10-02",
      to: "2026-10-08",
      tourId: 4,
      withoutGuide: true,
      custom: true,
    });
  });

  it("drops invalid values", () => {
    expect(parseDepartureQuery({ tour: "abc", noGuide: "yes", from: "x" }, today)).toMatchObject({
      tourId: undefined,
      withoutGuide: false,
      custom: false,
    });
  });
});

describe("parseDepartureParams", () => {
  it("accepts a numeric tour id and a real date", () => {
    expect(parseDepartureParams({ tourId: "7", date: "2026-10-12" })).toEqual({
      tourId: 7,
      date: "2026-10-12",
    });
  });

  it("rejects malformed segments", () => {
    expect(parseDepartureParams({ tourId: "7a", date: "2026-10-12" })).toBeNull();
    expect(parseDepartureParams({ tourId: "0", date: "2026-10-12" })).toBeNull();
    expect(parseDepartureParams({ tourId: "7", date: "2026-02-30" })).toBeNull();
  });
});

describe("action schemas", () => {
  it("allows unassigning with a null guide", () => {
    expect(
      assignGuideSchema.safeParse({ tourId: 1, date: "2026-10-12", guideId: null }).success,
    ).toBe(true);
  });

  it("trims the note, turns empty into null and caps the length", () => {
    expect(
      departureNoteSchema.parse({ tourId: 1, date: "2026-10-12", note: "  " }).note,
    ).toBeNull();
    const tooLong = departureNoteSchema.safeParse({
      tourId: 1,
      date: "2026-10-12",
      note: "a".repeat(1001),
    });
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0].message).toBe("departureNote");
  });
});
