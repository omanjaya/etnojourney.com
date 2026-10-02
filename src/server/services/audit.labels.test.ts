import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/repositories/audit.repository", () => ({ auditRepository: {} }));
import en from "../../../messages/en/adminUsers.json";
import id from "../../../messages/id/adminUsers.json";
import { auditActions } from "./audit.service";

describe("audit action labels", () => {
  for (const [locale, messages] of [["id", id], ["en", en]] as const) {
    it(`every audit action has a ${locale} label`, () => {
      const labels = messages.activity.actions as unknown as Record<string, Record<string, string> | undefined>;
      for (const action of auditActions) {
        const [group, verb] = action.split(".");
        expect(labels[group]?.[verb], action).toBeTruthy();
      }
    });
  }
});
