"use server";

import type { ActionResult } from "@/lib/action-result";
import { assertPermission } from "@/server/auth/guards";
import { paymentService } from "@/server/services/payment.service";
import { revalidate } from "@/features/shared/revalidate";
import { parseInput, runAction } from "@/features/shared/run-action";
import { recordRefundSchema } from "./schemas";

/**
 * Records a refund that was already paid out through the bank or the
 * Midtrans dashboard. Never calls the gateway's refund API.
 */
export async function recordRefundAction(
  paymentId: number,
  note: string,
): Promise<ActionResult<{ paymentId: number }>> {
  const parsed = await parseInput(recordRefundSchema, { paymentId, note });
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("payments.refund");
    const payment = await paymentService.recordRefund(
      actor.id,
      parsed.data.paymentId,
      parsed.data.note,
    );
    revalidate.admin();
    revalidate.account();
    return { paymentId: payment.id };
  });
}
