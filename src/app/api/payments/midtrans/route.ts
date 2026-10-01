import { NextResponse } from "next/server";
import { paymentService } from "@/server/services/payment.service";
import { verifySignature, type GatewayNotification } from "@/server/services/payment.rules";

/** Midtrans HTTP notification endpoint. Configure it in the Midtrans dashboard. */
export async function POST(request: Request) {
  const serverKey = paymentService.webhookKey();
  if (!serverKey) return NextResponse.json({ error: "not configured" }, { status: 404 });

  let notification: GatewayNotification;
  try {
    notification = (await request.json()) as GatewayNotification;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!verifySignature(notification, serverKey)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  try {
    const outcome = await paymentService.handleNotification(notification);
    return NextResponse.json({ ok: true, ...outcome });
  } catch (error) {
    console.error("[payment] webhook failed", error);
    // A 5xx makes Midtrans retry the notification later.
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
