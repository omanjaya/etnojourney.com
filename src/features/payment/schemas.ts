import { z } from "zod";

export const bookingIdSchema = z.coerce.number().int().positive();

export const simulateSchema = z.object({
  orderId: z.string().min(1).max(64),
  outcome: z.enum(["paid", "failed"]),
});
