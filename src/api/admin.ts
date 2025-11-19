import "dotenv/config";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { usersTable } from "@/db/auth";
import { casesTable } from "@/db/case";
import { otpOverrideLogsTable } from "@/db/otp";
import { patientsTable } from "@/db/patient";
import { db } from ".";
import { rbacCheck } from "./rbac";

const admin = new Hono()
	.use(rbacCheck({ permissions: ["admin"] }))
	.get("/otp-override-logs", async (c) => {
		const logs = await db
			.select({
				id: otpOverrideLogsTable.id,
				doctorId: otpOverrideLogsTable.doctorId,
				doctorName: usersTable.name,
				doctorUsername: usersTable.username,
				caseId: otpOverrideLogsTable.caseId,
				patientId: patientsTable.id,
				patientName: patientsTable.name,
				reason: otpOverrideLogsTable.reason,
				createdAt: otpOverrideLogsTable.createdAt,
			})
			.from(otpOverrideLogsTable)
			.innerJoin(usersTable, eq(usersTable.id, otpOverrideLogsTable.doctorId))
			.innerJoin(casesTable, eq(casesTable.id, otpOverrideLogsTable.caseId))
			.innerJoin(patientsTable, eq(patientsTable.id, casesTable.patient))
			.orderBy(desc(otpOverrideLogsTable.createdAt));

		return c.json({ logs });
	});

export default admin;
