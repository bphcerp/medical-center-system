import { sql } from "drizzle-orm";
import {
	integer,
	jsonb,
	pgEnum,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import z from "zod";
import { patientsTable } from "./patient";

export const finalizedStateEnum = pgEnum("finalized_state", [
	"opd",
	"admitted",
	"referred",
]);
export const identifierTypes = ["psrn", "student_id", "phone"] as const;
export const identifierType = pgEnum("identifier_type", identifierTypes);

export const medicineCategories = [
	"Capsule/Tablet",
	"External Application",
	"Injection",
	"Liquids/Syrups",
] as const;

export const categoryDataSchema = z.union([
	z.object({
		category: z.literal(medicineCategories[0]),
		mealTiming: z.union([z.literal("Before Meal"), z.literal("After Meal")]),
	}),
	z.object({
		category: z.literal(medicineCategories[1]),
		applicationArea: z.string(),
	}),
	z.object({
		category: z.literal(medicineCategories[2]),
		injectionRoute: z.union([
			z.literal("Intramuscular (IM)"),
			z.literal("Subcutaneous (SC)"),
			z.literal("Intravenous (IV)"),
		]),
	}),
	z.object({
		category: z.literal(medicineCategories[3]),
		liquidTiming: z.union([z.literal("Before Meal"), z.literal("After Meal")]),
	}),
]);

export const medicineCategoryEnum = pgEnum(
	"medicine_category",
	medicineCategories,
);

export const diseasesTable = pgTable(
	"diseases",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		name: varchar({ length: 1023 }).notNull(),
		icd: varchar({ length: 255 }).notNull().unique(),
	},
	(table) => [uniqueIndex("icd_idx").on(table.icd)],
);

export const medicinesTable = pgTable("medicines", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	drug: varchar({ length: 1023 }).notNull(),
	company: varchar({ length: 1023 }).notNull(),
	brand: varchar({ length: 1023 }).notNull(),
	strength: varchar({ length: 255 }).notNull(),
	type: varchar({ length: 255 }).notNull(),
	category: medicineCategoryEnum("category").notNull(),
	price: real().notNull(),
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
	duration: varchar({ length: 255 }).notNull(),
	durationUnit: varchar({ length: 255 }).notNull(),
	categoryData: jsonb(),
	comment: text(),
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

	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});
