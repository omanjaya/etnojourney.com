import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { count, desc, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import { auditLogs, user } from "@/server/db/schema";

export type NewAuditLog = typeof auditLogs.$inferInsert;

export type AuditLogFilters = {
  /** Only these actions (an action group); missing means all, empty means none. */
  actions?: readonly string[];
  /** A user id, or "system" for entries without an actor (webhooks). */
  actor?: string;
  /** Entries performed by, or about, this user. */
  involvingUser?: string;
};

function auditConditions(filters: AuditLogFilters): SQL | undefined {
  return and(
    filters.actions
      ? filters.actions.length
        ? inArray(auditLogs.action, [...filters.actions])
        : sql`false`
      : undefined,
    filters.actor === "system"
      ? isNull(auditLogs.actorId)
      : filters.actor
        ? eq(auditLogs.actorId, filters.actor)
        : undefined,
    filters.involvingUser
      ? or(
          eq(auditLogs.actorId, filters.involvingUser),
          and(eq(auditLogs.entityType, "user"), eq(auditLogs.entityId, filters.involvingUser)),
        )
      : undefined,
  );
}

export const auditRepository = {
  insert(entry: NewAuditLog, executor: DbExecutor = db) {
    return executor.insert(auditLogs).values(entry);
  },

  /** Chronological history of one entity, with the actor's name. */
  findByEntity(entityType: string, entityId: string) {
    return db
      .select({ log: auditLogs, actorName: user.name })
      .from(auditLogs)
      .leftJoin(user, eq(user.id, auditLogs.actorId))
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
      .orderBy(asc(auditLogs.createdAt), asc(auditLogs.id));
  },

  /** Activity log page: newest first, with the actor's name and role. */
  list(filters: AuditLogFilters, limit: number, offset: number) {
    return db
      .select({ log: auditLogs, actorName: user.name, actorRole: user.role })
      .from(auditLogs)
      .leftJoin(user, eq(user.id, auditLogs.actorId))
      .where(auditConditions(filters))
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(limit)
      .offset(offset);
  },

  count(filters: AuditLogFilters): Promise<number> {
    return db
      .select({ total: count() })
      .from(auditLogs)
      .where(auditConditions(filters))
      .then((rows) => rows[0]?.total ?? 0);
  },
};
