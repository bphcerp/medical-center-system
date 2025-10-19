import { date, integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const medicinesTable = pgTable("medicines", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	name: varchar({ length: 255 }).notNull(),
	quantity: integer().notNull(),
});

export const batchesTable = pgTable("batches", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	medicineId: integer()
		.references(() => medicinesTable.id)
		.notNull(),
	batchNum: varchar({ length: 255 }).notNull(),
	expiry: date().notNull(),
	quantity: integer().notNull(),
});
