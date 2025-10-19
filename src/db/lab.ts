import { index, integer, json, pgEnum, pgTable } from "drizzle-orm/pg-core";
import { casesTable } from "./case";
import { filesTable } from "./files";

export const statusEnum = pgEnum("status", [
	"Requested",
	"In Progress",
	"Done",
]);

export const labReportTypeEnum = pgEnum("lab_report_type", [
	"Blood Test",
	"Urinalysis",
]);

export const caseLabReportsTable = pgTable("case_prescriptions", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	caseId: integer()
		.references(() => casesTable.id)
		.notNull(),
	type: labReportTypeEnum("type").notNull(),
	status: statusEnum().notNull(),
	data: json(),
});

export const reportFilesTable = pgTable(
	"report_files",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		reportId: integer()
			.notNull()
			.references(() => caseLabReportsTable.id),
		fileId: integer()
			.notNull()
			.references(() => filesTable.id),
	},
	(table) => [index("report_file_idx").on(table.reportId)],
);
