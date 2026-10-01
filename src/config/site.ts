import "server-only";
import { getEnv } from "@/server/env";

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
};

export function siteContact(): SiteContact {
  const env = getEnv();
  return {
    email: env.CONTACT_EMAIL ?? null,
    phone: env.CONTACT_PHONE ?? null,
    address: env.CONTACT_ADDRESS ?? null,
  };
}

export const hasAnyContact = (contact: SiteContact) =>
  Boolean(contact.email || contact.phone || contact.address);
