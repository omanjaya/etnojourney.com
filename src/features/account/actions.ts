"use server";

import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { isAPIError } from "better-auth/api";
import { fail, type ActionResult } from "@/lib/action-result";
import { auth } from "@/server/auth";
import { getCurrentUser } from "@/server/auth/guards";
import { accountService } from "@/server/services/account.service";
import { createRateLimiter } from "@/features/auth/rate-limit";
import { parseInput, runAction } from "@/features/shared/run-action";
import { revalidate } from "@/features/shared/revalidate";
import { changePasswordSchema, profileSchema } from "./schemas";

/** Password changes per signed-in account; guards against current-password guessing. */
const passwordLimiter = createRateLimiter();
const PASSWORD_RULE = { max: 5, windowMs: 10 * 60_000 };

export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail((await getTranslations("errors"))("unauthorized"));

  const parsed = await parseInput(profileSchema, {
    name: formData.get("name"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    await accountService.updateProfile(user.id, parsed.data);
    // The first name appears in the site header and account greeting.
    revalidate.everything();
    return undefined;
  });
}

export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail((await getTranslations("errors"))("unauthorized"));

  const parsed = await parseInput(changePasswordSchema, {
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return parsed.result;

  const t = await getTranslations("account.settings");
  if (!passwordLimiter.hit(`changePassword:${user.id}`, PASSWORD_RULE)) {
    return fail(t("password.tooManyAttempts"));
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (error) {
    if (isAPIError(error)) {
      const code = (error.body as { code?: string } | undefined)?.code ?? "";
      if (code === "INVALID_PASSWORD") {
        return fail(t("password.wrongCurrent"), { currentPassword: [t("password.wrongCurrent")] });
      }
    } else {
      console.error("[account] changePassword", error);
    }
    return fail((await getTranslations("errors"))("unexpected"));
  }

  // Better Auth rotated the session cookie. Re-rendering this request would
  // still see the revoked cookie and bounce through /login, so navigate to a
  // fresh request that carries the new cookie and shows the confirmation.
  return redirect({ href: "/account/settings?password=changed", locale: await getLocale() });
}
