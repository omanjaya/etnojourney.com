import { Mail, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { hasAnyContact, siteContact } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { Reveal, SplitWords } from "@/components/motion";
import { Logo } from "@/components/shared/logo";
import { Container } from "./container";

export async function SiteFooter() {
  const t = await getTranslations("common");
  const contact = siteContact();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-indigo text-sand-100 relative overflow-hidden">
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-24 size-[28rem] animate-[spin_160s_linear_infinite] text-white/[0.04]"
        viewBox="0 0 100 100"
      >
        <defs>
          <pattern id="kawung" width="20" height="20" patternUnits="userSpaceOnUse">
            <g fill="currentColor">
              <ellipse cx="10" cy="4" rx="3" ry="4.5" />
              <ellipse cx="10" cy="16" rx="3" ry="4.5" />
              <ellipse cx="4" cy="10" rx="4.5" ry="3" />
              <ellipse cx="16" cy="10" rx="4.5" ry="3" />
            </g>
          </pattern>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#kawung)" />
      </svg>

      <Container className="relative border-b border-white/10 pt-20 pb-14">
        <Reveal variant="mask-left">
          <Reveal variant="none">
            <SplitWords
              as="p"
              text={t("footer.statement")}
              stagger={45}
              className="font-display max-w-4xl text-4xl leading-[1.05] text-white md:text-6xl"
            />
          </Reveal>
        </Reveal>
      </Container>

      <Container className="relative grid gap-x-4 gap-y-10 py-16 sm:grid-cols-6 lg:gap-x-8 xl:flex xl:justify-between xl:gap-12">
        <Reveal className="sm:col-span-6 xl:max-w-sm xl:flex-1" delay={0}>
          <Logo inverted />
          <p className="text-sand-100/70 mt-6 max-w-sm leading-relaxed">{t("footer.about")}</p>
        </Reveal>

        <Reveal className="sm:col-span-2 xl:shrink-0" delay={0.08}>
          <h3 className="text-sand-100/70 font-sans text-xs font-semibold tracking-[0.2em] uppercase">
            {t("footer.explore")}
          </h3>
          <FooterLinks
            links={[
              { href: "/tours", label: t("nav.tours") },
              { href: "/destinations", label: t("nav.destinations") },
              { href: "/account", label: t("nav.bookings") },
            ]}
          />
        </Reveal>

        <Reveal className="sm:col-span-2 xl:shrink-0" delay={0.16}>
          <h3 className="text-sand-100/70 font-sans text-xs font-semibold tracking-[0.2em] uppercase">
            {t("footer.company")}
          </h3>
          <FooterLinks
            links={[
              { href: "/about", label: t("footer.ourStory") },
              { href: "/about#responsible", label: t("footer.responsible") },
              { href: "/about#partners", label: t("footer.partners") },
            ]}
          />
        </Reveal>

        <Reveal className="sm:col-span-2 xl:shrink-0" delay={0.24}>
          <h3 className="text-sand-100/70 font-sans text-xs font-semibold tracking-[0.2em] uppercase">
            {t("footer.help")}
          </h3>
          <FooterLinks
            links={[
              { href: "/faq", label: t("footer.faq") },
              { href: "/cancellation-policy", label: t("footer.cancellation") },
              { href: "/privacy", label: t("footer.privacy") },
              { href: "/terms", label: t("footer.terms") },
              { href: "/credits", label: t("footer.credits") },
            ]}
          />
        </Reveal>

        {hasAnyContact(contact) && (
          <Reveal className="sm:col-span-6 xl:shrink-0" delay={0.32}>
            <h3 className="text-sand-100/70 font-sans text-xs font-semibold tracking-[0.2em] uppercase">
              {t("footer.contact")}
            </h3>
            <ul className="text-sand-100/80 mt-5 space-y-1 text-sm">
              {contact.address && (
                <li className="flex gap-3 py-2">
                  <MapPin className="text-gold size-4 shrink-0" aria-hidden />
                  {contact.address}
                </li>
              )}
              {contact.phone && (
                <li className="flex items-center gap-3">
                  <Phone className="text-gold size-4 shrink-0" aria-hidden />
                  <a
                    href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
                    className="inline-flex min-h-10 items-center hover:text-white"
                  >
                    {contact.phone}
                  </a>
                </li>
              )}
              {contact.email && (
                <li className="flex items-center gap-3">
                  <Mail className="text-gold size-4 shrink-0" aria-hidden />
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex min-h-10 items-center break-all hover:text-white"
                  >
                    {contact.email}
                  </a>
                </li>
              )}
            </ul>
          </Reveal>
        )}
      </Container>

      <Container className="text-sand-100/60 relative flex flex-col gap-2 border-t border-white/10 py-8 text-xs md:flex-row md:justify-between">
        <p>
          &copy; {year} EtnoJourney. {t("footer.rights")}
        </p>
        <p>{t("footer.madeIn")}</p>
      </Container>
    </footer>
  );
}

const linkClass =
  "inline-flex min-h-10 items-center xl:whitespace-nowrap transition-[color,translate] duration-300 ease-(--ease-editorial) hover:translate-x-1 hover:text-white";

function FooterLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <ul className="text-sand-100/80 mt-4 text-sm">
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href} className={linkClass}>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
