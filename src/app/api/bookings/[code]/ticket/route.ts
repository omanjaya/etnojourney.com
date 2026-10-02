import { renderTicketPdf } from "@/lib/pdf/ticket-pdf";
import { auth } from "@/server/auth";
import { activeSession } from "@/server/auth/guards";
import { isDomainError } from "@/server/services/errors";
import { ticketService } from "@/server/services/ticket.service";

const plain = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

/**
 * E-ticket PDF for the signed-in owner of a confirmed or completed booking.
 * 401 without a session, 404 for unknown codes and other users' bookings
 * (no enumeration), 403 while the booking is pending or cancelled.
 * `?locale=en` picks the language; otherwise the user's saved one is used.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/bookings/[code]/ticket">) {
  // activeSession: a disabled account is treated as signed out.
  const session = activeSession(await auth.api.getSession({ headers: request.headers }));
  if (!session) return plain("Unauthorized", 401);

  const { code } = await ctx.params;
  const locale = new URL(request.url).searchParams.get("locale");

  let ticket;
  try {
    ticket = await ticketService.forOwner(session.user.id, code, locale);
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") return plain("Not Found", 404);
    if (isDomainError(error) && error.code === "forbidden") return plain("Forbidden", 403);
    throw error;
  }

  const pdf = await renderTicketPdf(ticket.data, ticket.logo);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.byteLength),
      "Content-Disposition": `attachment; filename="${ticket.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
