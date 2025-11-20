import {
	boolean,
	index,
	integer,
	json,
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { casesTable } from "./case";
import { filesTable } from "./files";

export const statusEnums = [
	"Requested",
	"Sample Collected",
	"Complete",
] as const;
export const statusEnum = pgEnum("status", statusEnums);

// exportable type as more tests can be added in the future
// and changing code everywhere else wont be a headache

export const caseLabReportsTable = pgTable(
	"case_lab_reports",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		caseId: integer()
			.references(() => casesTable.id)
			.notNull(),
		testId: integer()
			.references(() => labTestsMasterTable.id)
			.notNull(),
		status: statusEnum().notNull().default("Requested"),
		metadata: json(),
		createdAt: timestamp().notNull().defaultNow(),
		updatedAt: timestamp().notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("case_test_idx").on(table.caseId, table.testId),
		index("case_idx").on(table.caseId),
		index("status_idx").on(table.status),
	],
);

export const labTestFilesTable = pgTable(
	"lab_test_files",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		caseLabReportId: integer()
			.notNull()
			.references(() => caseLabReportsTable.id, { onDelete: "cascade" }),
		fileId: integer()
			.notNull()
			.references(() => filesTable.id),
		createdAt: timestamp().notNull().defaultNow(),
	},
	(table) => [
		index("case_lab_report_idx").on(table.caseLabReportId),
		index("file_idx").on(table.fileId),
	],
);

export const labTestsMasterTable = pgTable("lab_tests_master", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	name: varchar({ length: 255 }).notNull(),
	category: varchar({ length: 255 }),
	isActive: boolean().notNull().default(true),
	createdAt: timestamp().notNull().defaultNow(),
	updatedAt: timestamp().notNull().defaultNow(),
});
