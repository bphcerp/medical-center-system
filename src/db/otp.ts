import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { casesTable } from "./case";

export const doctorCaseHistoryOtpsTable = pgTable("doctor_case_history_otps", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	doctorId: integer()
		.references(() => usersTable.id)
		.notNull(),
	caseId: integer()
		.references(() => casesTable.id)
		.notNull(),
	otp: integer().notNull(),
	createdAt: timestamp().notNull().defaultNow(),
});

export const otpOverrideLogsTable = pgTable("otp_override_logs", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	doctorId: integer()
		.references(() => usersTable.id)
		.notNull(),
	caseId: integer()
		.references(() => casesTable.id)
		.notNull(),
	reason: text().notNull(),
	createdAt: timestamp().notNull().defaultNow(),
});
