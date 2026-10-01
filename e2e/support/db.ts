import { createHash, randomInt } from "node:crypto";
import postgres from "postgres";
import { assertTestDatabase, TEST_DATABASE_URL } from "./env";

assertTestDatabase();

/**
 * Direct access to the test database for arranging data the UI can't create
 * quickly (e.g. a completed trip in the past) and for asserting side effects.
 */
export const sql = postgres(TEST_DATABASE_URL, { max: 2, idle_timeout: 2, onnotice: () => {} });

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function uniqueCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `EJ-${code}`;
}

/** YYYY-MM-DD in Asia/Jakarta, offset by `days` (the app's business time zone). */
export function jakartaDate(days: number): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** A far-future date that is very unlikely to collide with other tests. */
export function uniqueFutureDate(): string {
  return jakartaDate(60 + randomInt(600));
}

export async function userIdByEmail(email: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`select id from "user" where email = ${email}`;
  if (!row) throw new Error(`No user ${email} in the test database`);
  return row.id;
}

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export async function createBooking(options: {
  email: string;
  tourSlug: string;
  status?: BookingStatus;
  travelDate?: string;
  participants?: number;
}) {
  const userId = await userIdByEmail(options.email);
  const [tour] = await sql<{ id: number; price: number }[]>`
    select id, price_per_person as price from tours where slug = ${options.tourSlug}`;
  if (!tour) throw new Error(`No tour ${options.tourSlug}`);
  const participants = options.participants ?? 2;
  const code = uniqueCode();
  const [booking] = await sql<{ id: number; code: string; total: number }[]>`
    insert into bookings (code, user_id, tour_id, travel_date, participants, unit_price, total_price,
                          status, contact_name, contact_phone)
    values (${code}, ${userId}, ${tour.id}, ${options.travelDate ?? uniqueFutureDate()},
            ${participants}, ${tour.price}, ${tour.price * participants},
            ${options.status ?? "pending"}, 'E2E Traveller', '081234567890')
    returning id, code, total_price as total`;
  return booking;
}

export async function bookingStatus(code: string): Promise<string | undefined> {
  const [row] = await sql<{ status: string }[]>`select status from bookings where code = ${code}`;
  return row?.status;
}

export async function createPendingPayment(bookingId: number, amount: number, code: string) {
  const orderId = `${code}-${Date.now()}`;
  await sql`
    insert into payments (booking_id, provider, order_id, amount, status, redirect_url)
    values (${bookingId}, 'midtrans', ${orderId}, ${amount}, 'pending', 'https://example.test/pay')`;
  return orderId;
}

export async function paymentStatus(orderId: string): Promise<string | undefined> {
  const [row] = await sql<
    { status: string }[]
  >`select status from payments where order_id = ${orderId}`;
  return row?.status;
}

export async function tourIsPublished(slug: string): Promise<boolean> {
  const [row] = await sql<{ published: boolean }[]>`
    select is_published as published from tours where slug = ${slug}`;
  return row.published;
}

export async function setTourPublished(slug: string, published: boolean) {
  await sql`update tours set is_published = ${published} where slug = ${slug}`;
}

/** Midtrans notification signature: SHA-512 of order_id + status_code + gross_amount + key. */
export function midtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
): string {
  return createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
}
