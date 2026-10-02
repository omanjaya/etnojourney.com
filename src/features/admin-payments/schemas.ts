import { z } from "zod";
import { paymentStatus } from "@/server/db/schema";

/** A refund is recorded with a short reference, e.g. the bank transfer ID. */
export const recordRefundSchema = z.object({
  paymentId: z.number().int().positive(),
  note: z.string().trim().min(3, "refundNote").max(500, "refundNote"),
});

/* ---------------------------------------------------------------- */
/* List filters (URL search params)                                  */
/* ---------------------------------------------------------------- */

type RawParams = Record<string, string | string[] | undefined>;

/** Each param is validated on its own; an invalid one is dropped, not fatal. */
const optionalParam = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

const adminPaymentQuerySchema = z.object({
  q: optionalParam(z.string().trim().min(1).max(100)),
  status: optionalParam(z.enum(paymentStatus.enumValues)),
});

export type AdminPaymentQuery = z.infer<typeof adminPaymentQuerySchema>;

/** `?q=` (booking code or order id) and `?status=` for the admin payments list. */
export function parseAdminPaymentQuery(raw: RawParams): AdminPaymentQuery {
  return adminPaymentQuerySchema.parse(
    Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
    ),
  );
}
