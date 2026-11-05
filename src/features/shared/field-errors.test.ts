import { describe, expect, it } from "vitest";
import { z } from "zod";
import { groupFieldErrors, issueParams } from "./field-errors";

const schema = z.object({
  slug: z.string().min(1, "required"),
  title: z.object({
    id: z.string().min(1, "required"),
    en: z.string().min(1, "englishRequired").max(5, "tooLong"),
  }),
  itinerary: z.array(z.object({ title: z.string().min(1, "required") })).max(1, "tooMany"),
});

const issuesFor = (input: unknown) => {
  const parsed = schema.safeParse(input);
  if (parsed.success) throw new Error("expected a failure");
  return parsed.error.issues;
};

describe("groupFieldErrors", () => {
  it("keys messages by top-level field and by every dotted prefix", () => {
    const issues = issuesFor({
      slug: "",
      title: { id: "Judul", en: "" },
      itinerary: [{ title: "" }, { title: "Dua" }],
    });
    expect(groupFieldErrors(issues, (issue) => issue.message)).toEqual({
      slug: ["required"],
      title: ["englishRequired"],
      "title.en": ["englishRequired"],
      itinerary: ["required", "tooMany"],
      "itinerary.0": ["required"],
      "itinerary.0.title": ["required"],
    });
  });

  it("does not repeat a message under the same key", () => {
    const issues = issuesFor({
      slug: "x",
      title: { id: "", en: "" },
      itinerary: [{ title: "" }, { title: "" }],
    });
    const grouped = groupFieldErrors(issues, (issue) => issue.message);
    expect(grouped.title).toEqual(["required", "englishRequired"]);
    expect(grouped.itinerary).toEqual(["required", "tooMany"]);
  });

  it("passes each issue to translate", () => {
    const issues = issuesFor({ slug: "", title: { id: "a", en: "b" }, itinerary: [] });
    expect(groupFieldErrors(issues, (issue) => `t:${issue.message}`)).toEqual({
      slug: ["t:required"],
    });
  });
});

describe("issueParams", () => {
  it("exposes the limit of size checks", () => {
    const [tooLong] = issuesFor({
      slug: "x",
      title: { id: "a", en: "panjang sekali" },
      itinerary: [],
    });
    expect(issueParams(tooLong)).toEqual({ max: 5 });

    const tooShort = z.string().min(3).safeParse("a");
    expect(!tooShort.success && issueParams(tooShort.error.issues[0])).toEqual({ min: 3 });
  });

  it("is empty for other issues", () => {
    const custom = z
      .string()
      .refine(() => false, "nope")
      .safeParse("x");
    expect(!custom.success && issueParams(custom.error.issues[0])).toEqual({});
    const wrongType = z.number().safeParse("x");
    expect(!wrongType.success && issueParams(wrongType.error.issues[0])).toEqual({});
  });
});
