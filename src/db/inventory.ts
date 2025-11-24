import { date, integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { medicinesTable } from "./case";

export const inventoryMedicinesTable = pgTable("inventory_medicines", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	medicineId: integer()
		.references(() => medicinesTable.id)
		.notNull(),
	criticalQty: integer(),
});

export const batchesTable = pgTable("batches", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	medicineId: integer()
		.references(() => inventoryMedicinesTable.id, { onDelete: "cascade" })
		.notNull(),
	batchNum: varchar({ length: 255 }).notNull(),
	expiry: date().notNull(), //TODO: Decide whether expired batches contribute to inventory quantity
	quantity: integer().notNull(),
});
