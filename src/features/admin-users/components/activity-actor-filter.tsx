"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Query = Record<string, string | undefined>;

/** Actor dropdown for the activity log; rewrites the URL and resets to page 1. */
export function ActivityActorFilter({
  query,
  actors,
}: {
  query: Query;
  actors: { id: string; name: string }[];
}) {
  const t = useTranslations("adminUsers.activity");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const apply = (actor: string) => {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries({ ...query, actor: actor || undefined })) {
      if (key !== "page" && value) next[key] = value;
    }
    startTransition(() =>
      router.replace({ pathname: "/admin/activity", query: next }, { scroll: false }),
    );
  };

  return (
    <label
      className={cn(
        "text-ink-soft flex flex-col gap-1 text-xs font-medium",
        pending && "opacity-70 transition-opacity",
      )}
    >
      {t("actorLabel")}
      <select
        value={query.actor ?? ""}
        onChange={(event) => apply(event.target.value)}
        className="border-line focus:border-terracotta focus:ring-terracotta/10 h-11 rounded-full border bg-white pr-8 pl-4 text-sm transition-colors focus:ring-4 focus:outline-none"
      >
        <option value="">{t("allActors")}</option>
        {actors.map((actor) => (
          <option key={actor.id} value={actor.id}>
            {actor.name}
          </option>
        ))}
        <option value="system">{t("system")}</option>
      </select>
    </label>
  );
}
