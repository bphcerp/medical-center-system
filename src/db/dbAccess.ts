import {
	integer,
	jsonb,
	pgTable,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const dbAccessAuditLogsTable = pgTable("db_access_audit_logs", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	sessionId: varchar("session_id", { length: 255 }),
	actorUserId: integer("actor_user_id").references(() => usersTable.id),
	actorEmail: varchar("actor_email", { length: 255 }),
	actorName: varchar("actor_name", { length: 255 }),
	action: varchar({ length: 64 }).notNull(),
	reason: varchar({ length: 2048 }),
	details: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
