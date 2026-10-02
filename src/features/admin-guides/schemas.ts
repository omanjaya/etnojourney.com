import { z } from "zod";
import {
  GUIDE_LANGUAGES,
  normalizeEmail,
  normalizeLanguages,
  normalizePhone,
} from "@/server/services/guide.rules";

/** Empty input means "not set" (stored as null). */
const optionalText = (max: number, message = "invalid") =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null);

export const guideFormSchema = z.object({
  name: z.string().trim().min(2, "nameMin").max(120, "invalid"),
  organization: optionalText(120),
  phone: z
    .string()
    .trim()
    .max(32, "phone")
    .refine((value) => value === "" || normalizePhone(value) !== null, "phone")
    .transform((value) => (value === "" ? null : normalizePhone(value))),
  email: z
    .string()
    .trim()
    .max(254, "email")
    .refine((value) => value === "" || z.email().safeParse(value).success, "email")
    .transform((value) => (value === "" ? null : normalizeEmail(value))),
  languages: z
    .array(z.enum(GUIDE_LANGUAGES, { error: "invalid" }))
    .max(GUIDE_LANGUAGES.length, "invalid")
    .transform(normalizeLanguages),
  destinationIds: z
    .array(z.number().int().positive().max(2_147_483_647))
    .max(100, "invalid")
    .transform((ids) => [...new Set(ids)]),
  notes: optionalText(2000, "guideNotesMax"),
  isActive: z.boolean(),
});

/** What the client form sends (before trimming and normalising). */
export type GuideFormValues = z.input<typeof guideFormSchema>;

export const guideIdSchema = z.number().int().positive().max(2_147_483_647);

export const linkAccountSchema = z.object({
  guideId: guideIdSchema,
  email: z.string().trim().min(1, "required").max(254, "email").pipe(z.email("email")),
});
