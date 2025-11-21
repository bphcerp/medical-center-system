import {
	integer,
	pgEnum,
	pgTable,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { patientTypes } from "@/lib/types/patient";

export const patientTypeEnum = pgEnum("patient_type", patientTypes);
export const sexTypeEnum = pgEnum("sex_type", ["male", "female"]);

export const patientsTable = pgTable("patients", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	name: varchar({ length: 255 }).notNull(),
	type: patientTypeEnum("type").notNull(),
	age: integer().notNull(),
	sex: sexTypeEnum("sex").notNull(),
});

export const studentsTable = pgTable(
	"students",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		studentId: varchar({ length: 255 }).notNull().unique(),
		email: varchar({ length: 255 }).notNull().unique(),
		phone: varchar({ length: 255 }).notNull(),
		patientId: integer()
			.unique()
			.references(() => patientsTable.id)
			.notNull(),
	},
	(table) => [uniqueIndex("student_id_idx").on(table.studentId)],
);

export const professorsTable = pgTable(
	"professors",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		psrn: varchar({ length: 255 }).notNull().unique(),
		email: varchar({ length: 255 }).notNull().unique(),
		phone: varchar({ length: 255 }).notNull(),
		patientId: integer()
			.unique()
			.references(() => patientsTable.id)
			.notNull(),
	},
	(table) => [uniqueIndex("psrn_idx").on(table.psrn)],
);

export const dependentsTable = pgTable(
	"dependents",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		psrn: varchar({ length: 255 })
			.notNull()
			.references(() => professorsTable.psrn),
		patientId: integer()
			.unique()
			.references(() => patientsTable.id)
			.notNull(),
	},
	(table) => [uniqueIndex("dependent_psrn_idx").on(table.psrn)],
);

export const visitorsTable = pgTable(
	"visitors",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		email: varchar({ length: 255 }).notNull(),
		phone: varchar({ length: 255 }).notNull().unique(),
		patientId: integer()
			.unique()
			.references(() => patientsTable.id)
			.notNull(),
	},
	(table) => [uniqueIndex("visitor_phone_idx").on(table.phone)],
);
