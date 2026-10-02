import { MessageSquareReply, Quote } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { Review } from "@/server/db/schema";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/i18n-text";
import { Stars } from "@/components/ui/stars";
import { Reveal } from "@/components/motion";
import {
  ReviewPhotoStrip,
  type ReviewStripPhoto,
} from "@/features/reviews/components/review-photo-strip";

export function ReviewList({
  reviews,
  locale,
  photos,
}: {
  reviews: Review[];
  locale: Locale;
  /** Public photos per review id (published reviews, hidden photos excluded). */
  photos?: ReadonlyMap<number, ReviewStripPhoto[]>;
}) {
  const format = useFormatter();
  const t = useTranslations("reviews.reply");
  return (
    <ul className="grid gap-5 md:grid-cols-2">
      {reviews.map((review, i) => (
        <li key={review.id} className="flex">
          <Reveal
            delay={Math.min((i % 2) * 0.12 + Math.floor(i / 2) * 0.06, 0.4)}
            className="border-line flex w-full flex-col rounded-(--radius-card) border bg-white p-6 transition-shadow duration-500 hover:shadow-[0_24px_50px_-34px_rgb(29_26_22/0.45)]"
          >
            <div className="flex items-center justify-between">
              <Stars value={review.rating} />
              <Quote className="text-sand-300 size-5" aria-hidden />
            </div>
            <p className="text-ink-soft mt-4 flex-1 leading-relaxed">
              {localize(review.body, locale)}
            </p>
            <ReviewPhotoStrip photos={photos?.get(review.id) ?? []} author={review.authorName} />
            <div className="mt-6 flex items-center gap-3">
              <span className="bg-terracotta-light font-display text-terracotta-dark grid size-10 place-items-center rounded-full font-semibold">
                {review.authorName.charAt(0)}
              </span>
              <div className="text-sm">
                <p className="font-semibold">{review.authorName}</p>
                <p className="text-muted">
                  {review.country} &middot;{" "}
                  {format.dateTime(review.createdAt, { month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            {review.reply && (
              <div className="border-terracotta/50 bg-sand-50 mt-5 rounded-xl border-l-2 px-4 py-3">
                <p className="text-ink flex items-center gap-2 text-sm font-semibold">
                  <MessageSquareReply className="text-terracotta size-4" aria-hidden />
                  {t("label")}
                </p>
                {review.repliedAt && (
                  <p className="text-muted mt-0.5 text-xs">
                    <time dateTime={review.repliedAt.toISOString()}>
                      {format.dateTime(review.repliedAt, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                  </p>
                )}
                <p className="text-ink-soft mt-2 text-sm leading-relaxed whitespace-pre-line">
                  {review.reply}
                </p>
              </div>
            )}
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
