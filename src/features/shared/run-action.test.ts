import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {} }));
vi.mock("next-intl/server", () => {
  const messages: Record<string, string> = {
    "errors.validation": "Check the marked fields.",
    "errors.fields.required": "Required.",
    "errors.fields.invalid": "Invalid.",
  };
  const t = Object.assign((key: string) => messages[key] ?? key, {
    has: (key: string) => key in messages,
  });
  return { getTranslations: async () => t };
});

const { parseInput } = await import("./run-action");

const localized = z.object({
  id: z.string().min(1, "required"),
  en: z.string().min(1, "required"),
});
const schema = z.object({
  title: localized,
  itinerary: z.array(z.object({ title: localized })).min(1, "required"),
});

describe("parseInput", () => {
  it("keeps the top-level keys and adds a dotted key per nested level", async () => {
    const parsed = await parseInput(schema, {
      title: { id: "Judul", en: "" },
      itinerary: [{ title: { id: "Hari", en: "Day" } }, { title: { id: "", en: "Day 2" } }],
    });
    expect(parsed.success).toBe(false);
    if (parsed.success || parsed.result.ok) return;
    expect(parsed.result.error).toBe("Check the marked fields.");
    expect(parsed.result.fieldErrors).toEqual({
      title: ["Required."],
      "title.en": ["Required."],
      itinerary: ["Required."],
      "itinerary.1": ["Required."],
      "itinerary.1.title": ["Required."],
      "itinerary.1.title.id": ["Required."],
    });
  });

  it("returns the data when the input is valid", async () => {
    const parsed = await parseInput(schema, {
      title: { id: "Judul", en: "Title" },
      itinerary: [{ title: { id: "Hari", en: "Day" } }],
    });
    expect(parsed).toEqual({
      success: true,
      data: {
        title: { id: "Judul", en: "Title" },
        itinerary: [{ title: { id: "Hari", en: "Day" } }],
      },
    });
  });
});
