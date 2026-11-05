"use client";

import Image from "next/image";
import { ImagePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { flushSync } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CreditForm, emptyCredit } from "./credit-form";

/** An uploaded photo in use without a credit, with where it appears. */
export type UncreditedUpload = {
  path: string;
  usedIn: { key: string; label: string; href: string }[];
};

/**
 * Uploaded photos that still need a credit, shown as thumbnails with the
 * tours and destinations that use them, so the operator can tell which photo
 * is which. A manual form (typed /media/ path) stays as a fallback.
 */
export function AddCredit({ uploads }: { uploads: UncreditedUpload[] }) {
  const t = useTranslations("adminInsights.credits");
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [created, setCreated] = useState(false);

  // A saved credit drops its photo from the list (the page revalidates).
  const done = () => {
    setOpenPath(null);
    setCreated(true);
  };

  // The card's button and its form replace each other: keep keyboard focus.
  const openForm = (card: HTMLElement | null, path: string) => {
    flushSync(() => {
      setCreated(false);
      setOpenPath(path);
    });
    card?.querySelector<HTMLElement>("input")?.focus();
  };
  const closeForm = (card: HTMLElement | null) => {
    flushSync(() => setOpenPath(null));
    card?.querySelector<HTMLElement>("[data-credit-open]")?.focus();
  };

  return (
    <section
      aria-labelledby="add-credit-title"
      className="border-line mb-8 rounded-(--radius-card) border bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-2xl">
          <h2 id="add-credit-title" className="text-xl">
            {t("add.title")}
          </h2>
          <p className="text-muted mt-1 text-sm">
            {uploads.length
              ? t("add.pending", { count: uploads.length })
              : t("add.description")}
          </p>
        </div>
        <Button
          type="button"
          variant={manualOpen ? "ghost" : "outline"}
          size="sm"
          onClick={() => setManualOpen((v) => !v)}
          aria-expanded={manualOpen}
          aria-controls="add-credit-form"
        >
          <ImagePlus aria-hidden />
          {manualOpen ? t("add.close") : t("add.open")}
        </Button>
      </div>

      {created && (
        <Alert tone="success" className="mt-4">
          {t("add.created")}
        </Alert>
      )}

      {uploads.length > 0 && (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {uploads.map((upload) => {
            const open = openPath === upload.path;
            const owners = upload.usedIn.map((owner) => owner.label).join(", ");
            return (
              <li
                key={upload.path}
                data-credit-card={upload.path}
                className={cn(
                  "border-line rounded-xl border p-3",
                  open && "bg-sand-50 md:col-span-2",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-sand-200 relative size-16 shrink-0 overflow-hidden rounded-lg">
                    <Image src={upload.path} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="text-muted text-xs">{t("add.usedIn")}</p>
                    <p className="line-clamp-2">
                      {upload.usedIn.map((owner, index) => (
                        <span key={owner.key}>
                          {index > 0 && ", "}
                          <Link
                            href={owner.href}
                            className="hover:text-terracotta font-medium underline-offset-2 hover:underline"
                          >
                            {owner.label}
                          </Link>
                        </span>
                      ))}
                    </p>
                  </div>
                  {!open && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-credit-open=""
                      onClick={(event) => openForm(event.currentTarget.closest("li"), upload.path)}
                      aria-label={t("add.creditFor", { owner: owners })}
                    >
                      {t("add.credit")}
                    </Button>
                  )}
                </div>
                {open && (
                  <div className="border-line mt-4 border-t pt-4">
                    <CreditForm
                      mode="create"
                      pathLocked
                      defaults={{ ...emptyCredit, path: upload.path }}
                      onDone={done}
                      onCancel={() =>
                        closeForm(
                          document.querySelector<HTMLElement>(
                            `[data-credit-card="${CSS.escape(upload.path)}"]`,
                          ),
                        )
                      }
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {manualOpen && (
        <div id="add-credit-form" className="border-line mt-5 border-t pt-5">
          <CreditForm mode="create" defaults={emptyCredit} />
        </div>
      )}
    </section>
  );
}
