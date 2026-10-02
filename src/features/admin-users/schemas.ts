import { z } from "zod";
import { userRole } from "@/server/db/schema";
import { auditGroups } from "@/server/services/audit.rules";

const userId = z.string().trim().min(1, "required").max(64, "invalid");

export const changeRoleSchema = z.object({
  userId,
  role: z.enum(userRole.enumValues, { error: "invalid" }),
});

export const setDisabledSchema = z.object({
  userId,
  disabled: z.boolean(),
});

/* ---------------------------------------------------------------- */
/* List filters (URL search params)                                  */
/* ---------------------------------------------------------------- */

type RawParams = Record<string, string | string[] | undefined>;

/** Each param is validated on its own; an invalid one is dropped, not fatal. */
const optionalParam = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

const flatten = (raw: RawParams) =>
  Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );

const adminUserQuerySchema = z.object({
  q: optionalParam(z.string().trim().min(1).max(100)),
  role: optionalParam(z.enum(userRole.enumValues)),
});

export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;

export function parseAdminUserQuery(raw: RawParams): AdminUserQuery {
  return adminUserQuerySchema.parse(flatten(raw));
}

const activityQuerySchema = z.object({
  group: optionalParam(z.enum(auditGroups)),
  /** A user id or "system". */
  actor: optionalParam(z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)),
});

export type ActivityQuery = z.infer<typeof activityQuerySchema>;

export function parseActivityQuery(raw: RawParams): ActivityQuery {
  return activityQuerySchema.parse(flatten(raw));
}
