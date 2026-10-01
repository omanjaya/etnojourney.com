import "server-only";

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

const clean = (value: string | undefined) => value?.trim() || null;

export function siteContact(): SiteContact {
  return {
    email: clean(process.env.CONTACT_EMAIL),
    phone: clean(process.env.CONTACT_PHONE),
    address: clean(process.env.CONTACT_ADDRESS),
  };
}

export const hasAnyContact = (contact: SiteContact) =>
  Boolean(contact.email || contact.phone || contact.address);
