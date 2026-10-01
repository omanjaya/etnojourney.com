import { z } from "zod";

export const createBookingSchema = z.object({
  tourId: z.coerce.number().int().positive("invalid"),
  travelDate: z.iso.date("date"),
  participants: z.coerce.number().int("participants").min(1, "participants").max(50, "participants"),
  contactName: z.string().trim().min(2, "nameMin").max(80, "invalid"),
  contactPhone: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "phone")),
  notes: z.string().trim().max(500, "notesMax").optional().default(""),
});

export type CreateBookingValues = z.infer<typeof createBookingSchema>;

export const bookingIdSchema = z.coerce.number().int().positive();
