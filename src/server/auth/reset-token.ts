import "server-only";
import { auth } from "./index";

/**
 * Whether a password reset token belongs to a disabled account. Read-only: the
 * token is not consumed, so Better Auth still validates it afterwards.
 */
export async function resetTokenOwnerIsDisabled(token: string): Promise<boolean> {
  const { internalAdapter } = await auth.$context;
  const verification = await internalAdapter.findVerificationValue(`reset-password:${token}`);
  if (!verification || verification.expiresAt < new Date()) return false;
  const owner = await internalAdapter.findUserById(verification.value);
  return Boolean((owner as { disabledAt?: Date | null } | null)?.disabledAt);
}
