import { sql } from "drizzle-orm";
import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const filesTable = pgTable("files", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	url: varchar({ length: 255 }).notNull().unique(),
	allowed: integer("allowed").array().notNull().default(sql`'{}'::integer[]`),
});
