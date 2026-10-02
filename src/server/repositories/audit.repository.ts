import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import { auditLogs, user } from "@/server/db/schema";

export type NewAuditLog = typeof auditLogs.$inferInsert;

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
};
