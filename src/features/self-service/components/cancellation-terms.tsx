import { CalendarClock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cancellationPolicy } from "@/config/cancellation";
import { MIN_LEAD_DAYS } from "@/server/services/booking.rules";
import { tierRanges } from "@/server/services/self-service.rules";
import { tierRangeMessage } from "../tier-copy";

/** Refund tiers from `src/config/cancellation.ts`, as a table for the policy page. */
export async function RefundTiersTable() {
  const t = await getTranslations("selfService");
  const ranges = tierRanges();
  return (
    <div>
      <p id="refund-tiers-caption" className="text-muted mb-3 text-sm">
        {t("policy.tiersCaption")}
      </p>
      <div className="border-line overflow-hidden rounded-xl border bg-white">
        <table aria-describedby="refund-tiers-caption" className="w-full text-base">
          <thead className="bg-sand-50 text-left text-sm">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("policy.tierColumn")}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("policy.refundColumn")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {ranges.map((range) => {
              const label = tierRangeMessage(range);
              return (
                <tr key={range.from} data-testid="refund-tier">
                  <td className="text-ink px-4 py-3">{t(`tier.${label.key}`, label.values)}</td>
                  <td className="text-ink px-4 py-3 font-medium">
                    {t("tier.refund", { percent: range.percent })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-muted mt-3 text-sm">{t("policy.rounding")}</p>
    </div>
  );
}

/** Self-service date-change rules from the same config. */
export async function RescheduleRules() {
  const t = await getTranslations("selfService.policy");
  const rules = [
    t("rescheduleMax", { max: cancellationPolicy.maxReschedules }),
    t("rescheduleClose", { days: cancellationPolicy.rescheduleMinDaysBefore }),
    t("rescheduleLead", { days: MIN_LEAD_DAYS }),
    t("reschedulePrice"),
  ];
  return (
    <div className="border-line rounded-xl border bg-white p-5">
      <h3 className="flex items-center gap-2 font-sans text-base font-semibold">
        <CalendarClock className="text-terracotta size-4" aria-hidden />
        {t("rescheduleTitle")}
      </h3>
      <ul className="marker:text-terracotta mt-3 list-disc space-y-2 pl-6 text-base">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </div>
  );
}
