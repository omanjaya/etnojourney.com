import { CalendarRange } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form-controls";
import { REPORT_PRESETS, type ReportPeriod } from "@/server/services/report.rules";

/**
 * Period presets as links plus a plain GET form for a custom range, so the
 * picker works without client JavaScript.
 */
export async function ReportPeriodPicker({ period }: { period: ReportPeriod }) {
  const t = await getTranslations("adminInsights.reports.period");
  const presets = REPORT_PRESETS.filter((p) => p !== "custom");

  return (
    <div className="short:mb-5 mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <nav aria-label={t("label")} className="flex scrollbar-none gap-2 overflow-x-auto pb-1">
        {presets.map((preset) => {
          const active = period.preset === preset;
          return (
            <Link
              key={preset}
              href={{ pathname: "/admin/reports", query: { period: preset } }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-ink bg-ink text-sand-50"
                  : "border-line text-ink-soft hover:border-sand-300 bg-white",
              )}
            >
              {t(`presets.${preset}`)}
            </Link>
          );
        })}
      </nav>
      <form method="get" className="flex flex-wrap items-end gap-2" aria-label={t("custom")}>
        <input type="hidden" name="period" value="custom" />
        <div className="flex flex-col gap-1">
          <Label htmlFor="report-from" className="text-xs">
            {t("from")}
          </Label>
          <Input
            id="report-from"
            name="from"
            type="date"
            defaultValue={period.from}
            required
            className="h-10 w-40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="report-to" className="text-xs">
            {t("to")}
          </Label>
          <Input
            id="report-to"
            name="to"
            type="date"
            defaultValue={period.to}
            required
            className="h-10 w-40"
          />
        </div>
        <Button
          type="submit"
          variant={period.preset === "custom" ? "dark" : "outline"}
          size="sm"
          className="h-10"
        >
          <CalendarRange aria-hidden />
          {t("apply")}
        </Button>
      </form>
    </div>
  );
}
