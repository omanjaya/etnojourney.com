"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/server/auth/guards";
import { wishlistService } from "@/server/services/wishlist.service";
import { revalidate } from "@/features/shared/revalidate";
import { runAction } from "@/features/shared/run-action";

const tourIdSchema = z.coerce.number().int().positive();

/** Returns the new saved state. */
export async function toggleWishlistAction(
  tourId: number,
): Promise<ActionResult<{ saved: boolean }>> {
  const t = await getTranslations("errors");
  const user = await getCurrentUser();
  if (!user) return fail(t("unauthorized"));

  const id = tourIdSchema.safeParse(tourId);
  if (!id.success) return fail(t("notFound"));

  return runAction(async () => {
    const saved = await wishlistService.toggle(user.id, id.data);
    revalidate.wishlist();
    return { saved };
  });
}
