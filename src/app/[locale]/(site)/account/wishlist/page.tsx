import { Heart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TourCard } from "@/components/shared/tour-card";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import { requireUser } from "@/server/auth/guards";
import { wishlistService } from "@/server/services/wishlist.service";

export default async function AccountWishlistPage() {
  const user = await requireUser();
  const [rows, t] = await Promise.all([
    wishlistService.list(user.id),
    getTranslations("account.wishlist"),
  ]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          <Button asChild>
            <Link href="/tours">{t("emptyCta")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <section>
      <h2 className="text-muted mb-8 font-sans text-sm font-semibold tracking-[0.2em] uppercase">
        {t("count", { count: rows.length })}
      </h2>
      <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <TourCard
            key={row.tour.id}
            data={row}
            action={<WishlistButton tourId={row.tour.id} initialSaved isAuthenticated />}
          />
        ))}
      </div>
    </section>
  );
}
