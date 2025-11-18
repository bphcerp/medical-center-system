import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { patientsTable } from "./patient";

export const doctorCaseHistoryOtpsTable = pgTable("doctor_case_history_otps", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	doctorId: integer()
		.unique()
		.references(() => usersTable.id)
		.notNull(),
	patientId: integer()
		.unique()
		.references(() => patientsTable.id)
		.notNull(),
	otp: integer().notNull(),
	createdAt: timestamp().notNull().defaultNow(),
});
