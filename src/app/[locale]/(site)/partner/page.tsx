import { CalendarClock, ChevronDown, History, Mail, MapPin, Phone, UserRoundX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requirePartner } from "@/server/auth/guards";
import { isGuideLanguage, PARTNER_PAST_DAYS } from "@/server/services/guide.rules";
import { partnerService } from "@/server/services/partner.service";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DepartureCard } from "@/features/partner/components/departure-card";

export default async function PartnerPortalPage() {
  // Pages must guard themselves: Next.js can render a page without its layout.
  const user = await requirePartner();
  const [{ guide, upcoming, past }, t, tl] = await Promise.all([
    partnerService.overview(user.id),
    getTranslations("partner"),
    getTranslations("partner.languages"),
  ]);

  return (
    <>
      <PageHeader
        compact
        eyebrow={t("home.eyebrow")}
        title={t("home.title", { name: (guide?.name ?? user.name).split(" ")[0] })}
        description={t("home.description")}
      />
      <Container className="short:py-8 py-10 md:py-14">
        {!guide || !guide.isActive ? (
          <EmptyState
            icon={UserRoundX}
            title={guide ? t("home.inactiveTitle") : t("home.unlinkedTitle")}
            description={guide ? t("home.inactiveDescription") : t("home.unlinkedDescription")}
          />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
            <div className="flex min-w-0 flex-col gap-10">
              <section aria-labelledby="upcoming-title">
                <h2 id="upcoming-title" className="mb-4 text-2xl">
                  {t("home.upcomingTitle")}
                </h2>
                {upcoming.length ? (
                  <ul className="flex flex-col gap-3">
                    {upcoming.map((departure) => (
                      <li key={`${departure.tourId}-${departure.date}`}>
                        <DepartureCard departure={departure} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={CalendarClock}
                    headingLevel="h3"
                    title={t("home.upcomingEmptyTitle")}
                    description={t("home.upcomingEmptyDescription")}
                  />
                )}
              </section>

              <details className="group border-line rounded-(--radius-card) border bg-white">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <History className="text-muted size-4" aria-hidden />
                    {t("home.pastTitle", { days: PARTNER_PAST_DAYS, count: past.length })}
                  </span>
                  <ChevronDown
                    className="text-muted size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    aria-hidden
                  />
                </summary>
                <div className="border-line border-t p-4 sm:p-5">
                  {past.length ? (
                    <ul className="flex flex-col gap-3">
                      {past.map((departure) => (
                        <li key={`${departure.tourId}-${departure.date}`}>
                          <DepartureCard departure={departure} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted text-sm">{t("home.pastEmpty")}</p>
                  )}
                </div>
              </details>
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <section className="border-line rounded-(--radius-card) border bg-white p-5 sm:p-6">
                <h2 className="text-xl">{t("profile.title")}</h2>
                <p className="mt-1 font-medium">{guide.name}</p>
                {guide.organization && <p className="text-muted text-sm">{guide.organization}</p>}
                <dl className="mt-4 flex flex-col gap-3 text-sm">
                  {guide.phone && (
                    <div>
                      <dt className="sr-only">{t("profile.phone")}</dt>
                      <dd className="flex items-center gap-2">
                        <Phone className="text-muted size-4 shrink-0" aria-hidden />
                        {guide.phone}
                      </dd>
                    </div>
                  )}
                  {guide.email && (
                    <div>
                      <dt className="sr-only">{t("profile.email")}</dt>
                      <dd className="flex items-center gap-2 break-all">
                        <Mail className="text-muted size-4 shrink-0" aria-hidden />
                        {guide.email}
                      </dd>
                    </div>
                  )}
                  {guide.destinations.length > 0 && (
                    <div>
                      <dt className="sr-only">{t("profile.destinations")}</dt>
                      <dd className="flex items-start gap-2">
                        <MapPin className="text-muted mt-0.5 size-4 shrink-0" aria-hidden />
                        {guide.destinations.join(", ")}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted text-xs">{t("profile.languages")}</dt>
                    <dd>
                      {guide.languages.length
                        ? guide.languages
                            .map((code) => (isGuideLanguage(code) ? tl(code) : code))
                            .join(", ")
                        : "-"}
                    </dd>
                  </div>
                </dl>
                <p className="text-muted mt-4 text-xs">{t("profile.changeHint")}</p>
              </section>
            </aside>
          </div>
        )}
      </Container>
    </>
  );
}
