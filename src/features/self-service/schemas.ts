import { z } from "zod";

export const cancelBookingSchema = z.object({
  bookingId: z.coerce.number().int().positive("invalid"),
  /** Refund share the traveller confirmed in the dialog (paid bookings). */
  expectedPercent: z.number().int().min(0, "invalid").max(100, "invalid"),
});

export const rescheduleBookingSchema = z.object({
  bookingId: z.coerce.number().int().positive("invalid"),
  travelDate: z.iso.date("date"),
});
