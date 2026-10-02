import "server-only";
import { getEnv } from "@/server/env";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";

/**
 * Public business contact details, from env so real values are configured per
 * deployment. Anything unset is simply not shown (footer, JSON-LD, emails):
 * never ship placeholder contact data, search engines treat it as real.
 */
export type SiteContact = {
  email: string | null;
  phone: string | null;
  /** Single line, e.g. "Jl. ..., Gianyar, Bali". */
  address: string | null;
  /** WhatsApp number for wa.me links: digits only, international format. */
  whatsapp: string | null;
};

export function siteContact(): SiteContact {
  const env = getEnv();
  return {
    email: env.CONTACT_EMAIL ?? null,
    phone: env.CONTACT_PHONE ?? null,
    address: env.CONTACT_ADDRESS ?? null,
    whatsapp: normalizeWhatsAppNumber(env.CONTACT_WHATSAPP),
  };
}

export const hasAnyContact = (contact: SiteContact) =>
  Boolean(contact.email || contact.phone || contact.address || contact.whatsapp);
