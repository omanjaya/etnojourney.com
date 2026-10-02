/**
 * Promotes an existing account to admin (the owner role) and re-enables it if
 * it was disabled. Use it to create the first real owner in production without
 * the demo seed: sign up on the site first, then run
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/make-admin.ts owner@example.com
 *
 * (or `npx tsx --env-file=.env scripts/make-admin.ts ...` locally). The change
 * is recorded in the activity log as a system action.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { auditLogs, user } from "@/server/db/schema";

async function main() {
  const parsed = z.email().safeParse(process.argv[2]?.trim().toLowerCase());
  if (!parsed.success) {
    console.error("Usage: npx tsx scripts/make-admin.ts <email>");
    return 1;
  }
  const email = parsed.data;

  const result = await db.transaction(async (tx) => {
    const [account] = await tx
      .select({ id: user.id, role: user.role, disabledAt: user.disabledAt })
      .from(user)
      .where(eq(user.email, email))
      .for("update");
    if (!account) return "missing" as const;
    if (account.role === "admin" && !account.disabledAt) return "unchanged" as const;

    await tx.update(user).set({ role: "admin", disabledAt: null }).where(eq(user.id, account.id));
    if (account.role !== "admin") {
      await tx.insert(auditLogs).values({
        actorId: null,
        action: "user.role_changed",
        entityType: "user",
        entityId: account.id,
        details: { from: account.role, to: "admin", via: "cli" },
      });
    }
    if (account.disabledAt) {
      await tx.insert(auditLogs).values({
        actorId: null,
        action: "user.enabled",
        entityType: "user",
        entityId: account.id,
        details: { via: "cli" },
      });
    }
    return "promoted" as const;
  });

  if (result === "missing") {
    console.error(
      `No account with email ${email}. Sign up on the site first, then run this again.`,
    );
    return 1;
  }
  console.log(
    result === "unchanged" ? `${email} is already an active admin.` : `${email} is now an admin.`,
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
