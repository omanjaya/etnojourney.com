"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { fail, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/server/auth/guards";
import { DomainError } from "@/server/services/errors";
import { isMockPaymentEnabled, paymentService } from "@/server/services/payment.service";
import { revalidate } from "@/features/shared/revalidate";
import { parseInput, runAction } from "@/features/shared/run-action";
import { bookingIdSchema, simulateSchema } from "./schemas";

async function unauthorized() {
  const t = await getTranslations("errors");
  return fail(t("unauthorized"));
}

export async function startPaymentAction(
  bookingId: number,
): Promise<ActionResult<{ redirectUrl: string }>> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const parsed = await parseInput(bookingIdSchema, bookingId);
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const result = await paymentService.start(user.id, parsed.data);
    revalidate.account();
    return result;
  });
}

/** Development-only payment simulator. Runs the same handler as the real webhook. */
export async function simulatePaymentAction(input: {
  orderId: string;
  outcome: "paid" | "failed";
}): Promise<ActionResult> {
  if (!isMockPaymentEnabled()) return fail((await getTranslations("errors"))("forbidden"));

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const parsed = await parseInput(simulateSchema, input);
  if (!parsed.success) return parsed.result;
  const { orderId, outcome } = parsed.data;

  const result = await runAction(async () => {
    const owned = await paymentService.getForUser(user.id, orderId);
    if (!owned || owned.payment.provider !== "mock") {
      throw new DomainError("notFound");
    }
    await paymentService.handleNotification({
      order_id: orderId,
      status_code: outcome === "paid" ? "200" : "202",
      gross_amount: `${owned.payment.amount}.00`,
      transaction_status: outcome === "paid" ? "settlement" : "deny",
      fraud_status: "accept",
      payment_type: "simulator",
    });
    revalidate.account();
    revalidate.admin();
    return undefined;
  });
  if (!result.ok) return result;

  redirect({
    href: `/payment/finish?order_id=${encodeURIComponent(orderId)}`,
    locale: await getLocale(),
  });
  return result;
}
