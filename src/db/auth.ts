import { sql } from "drizzle-orm";
import {
	integer,
	pgTable,
	text,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

export const permissionsTable = pgTable("permissions", {
	permission: text("permission").primaryKey(),
	description: text("description"),
});

export const rolesTable = pgTable("roles", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	name: varchar({ length: 255 }).notNull(),
	allowed: text("allowed").array().notNull().default(sql`'{}'::text[]`),
	disallowed: text("allowed").array().notNull().default(sql`'{}'::text[]`),
});

export const usersTable = pgTable(
	"users",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		username: varchar({ length: 255 }).notNull().unique(),
		passwordHash: varchar().notNull(),
		email: varchar({ length: 255 }).notNull().unique(),
		name: varchar({ length: 255 }).notNull(),
		phone: varchar({ length: 255 }).notNull(),
		role: integer("role")
			.notNull()
			.references(() => rolesTable.id),
	},
	(table) => [uniqueIndex("username_idx").on(table.username)],
);
