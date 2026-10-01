import { z } from "zod";
import { isoDateFromToday } from "@/lib/format";
import { isMonthInRange } from "@/server/services/availability.rules";

export const availabilityQuerySchema = z.object({
  tourId: z.coerce.number().int().positive("invalid"),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "invalid")
    // Evaluated per request so "today" is always current (Asia/Jakarta).
    .refine((month) => isMonthInRange(month, isoDateFromToday(0)), "invalid"),
});
