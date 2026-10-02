import { describe, expect, it } from "vitest";
import { actionsInGroup, auditGroupOf, auditGroups } from "./audit.rules";

const actions = [
  "booking.status_changed",
  "payment.refunded",
  "tour.created",
  "destination.deleted",
  "review.hidden",
  "closure.created",
  "user.role_changed",
  "credit.updated",
  "departure.assigned",
] as const;

describe("auditGroupOf", () => {
  it("maps every known prefix to a group", () => {
    expect(actions.map(auditGroupOf)).toEqual([
      "bookings",
      "payments",
      "catalogue",
      "catalogue",
      "reviews",
      "availability",
      "users",
      "credits",
      "operations",
    ]);
  });

  it("returns null for unknown actions", () => {
    expect(auditGroupOf("mystery.thing")).toBeNull();
  });
});

describe("actionsInGroup", () => {
  it("groups tours and destinations under catalogue", () => {
    expect(actionsInGroup(actions, "catalogue")).toEqual(["tour.created", "destination.deleted"]);
  });

  it("gives every group at least one action from the sample", () => {
    for (const group of auditGroups)
      expect(actionsInGroup(actions, group).length).toBeGreaterThan(0);
  });
});
