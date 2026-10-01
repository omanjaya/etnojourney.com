/**
 * Minimal Midtrans Snap client (REST only, no browser script).
 * Kept free of `server-only` so it can be unit tested; only server code imports it.
 */

export type MidtransConfig = {
  serverKey: string;
  isProduction: boolean;
};

export type SnapTransactionInput = {
  orderId: string;
  grossAmount: number;
  customer: { name: string; email: string; phone?: string };
  item: { id: string; name: string; price: number; quantity: number };
  finishUrl: string;
};

export type SnapTransaction = { token: string; redirectUrl: string };

export class MidtransError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "MidtransError";
  }
}

export function snapEndpoint(isProduction: boolean): string {
  return isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
}

export function buildSnapPayload(input: SnapTransactionInput) {
  const [firstName, ...rest] = input.customer.name.trim().split(/\s+/);
  return {
    transaction_details: { order_id: input.orderId, gross_amount: input.grossAmount },
    item_details: [
      {
        id: input.item.id,
        // Midtrans limits item names to 50 characters.
        name: input.item.name.slice(0, 50),
        price: input.item.price,
        quantity: input.item.quantity,
      },
    ],
    customer_details: {
      first_name: firstName,
      last_name: rest.join(" ") || undefined,
      email: input.customer.email,
      phone: input.customer.phone,
    },
    callbacks: { finish: input.finishUrl },
  };
}

export async function createSnapTransaction(
  config: MidtransConfig,
  input: SnapTransactionInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SnapTransaction> {
  const response = await fetchImpl(snapEndpoint(config.isProduction), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${config.serverKey}:`).toString("base64")}`,
    },
    body: JSON.stringify(buildSnapPayload(input)),
  });

  const body = (await response.json().catch(() => ({}))) as {
    token?: string;
    redirect_url?: string;
    error_messages?: string[];
  };
  if (!response.ok || !body.token || !body.redirect_url) {
    throw new MidtransError(
      `Snap transaction failed: ${body.error_messages?.join("; ") ?? response.statusText}`,
      response.status,
    );
  }
  return { token: body.token, redirectUrl: body.redirect_url };
}
