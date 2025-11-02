import { sql } from "drizzle-orm";
import {
	integer,
	pgEnum,
	pgTable,
	real,
	text,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { patientsTable } from "./patient";

export const medicineTypeEnum = pgEnum("medicine_type", [
	"tablet",
	"syrup",
	"injection",
	"drops",
]);
export const finalizedStateEnum = pgEnum("finalized_state", [
	"opd",
	"admitted",
	"referred",
]);
export const identifierTypes = ["psrn", "student_id", "phone"] as const;
export const identifierType = pgEnum("identifier_type", identifierTypes);

export const diseasesTable = pgTable(
	"diseases",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		name: varchar({ length: 1023 }).notNull(),
		description: text().notNull(),
		icd: varchar({ length: 255 }).notNull().unique(),
	},
	(table) => [uniqueIndex("icd_idx").on(table.icd)],
);

export const medicinesTable = pgTable("medicines", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	drug: varchar({ length: 4095 }).notNull(),
	type: medicineTypeEnum("type").notNull(),
});

export const casePrescriptionsTable = pgTable("case_prescriptions", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	caseId: integer()
		.references(() => casesTable.id)
		.notNull(),
	medicineId: integer()
		.references(() => medicinesTable.id)
		.notNull(),
	dosage: varchar({ length: 255 }).notNull(),
	frequency: varchar({ length: 255 }).notNull(),
	// TODO: Add a comment column
});

export const unprocessedTable = pgTable("unprocessed", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	identifierType: identifierType("identifier_type").notNull(),
	identifier: varchar({ length: 255 }).notNull(),
	patientId: integer()
		.references(() => patientsTable.id)
		.notNull(),
});

export const casesTable = pgTable("cases", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	token: integer().notNull().unique(),
	patient: integer()
		.references(() => patientsTable.id)
		.notNull(),

	weight: integer(),
	temperature: real(),
	heartRate: integer(),
	respiratoryRate: integer(),
	bloodPressureSystolic: integer(),
	bloodPressureDiastolic: integer(),
	bloodSugar: integer(),
	spo2: integer(),

	consultationNotes: text(),
	diagnosis: integer().array(),

	finalizedState: finalizedStateEnum("finalized_state"),
	associatedUsers: integer("associated_users")
		.array()
		.notNull()
		.default(sql`'{}'::integer[]`),
});
