import "dotenv/config";
import { count, desc, eq, gte, sql } from "drizzle-orm";
import { usersTable } from "@/db/auth";
import {
	casePrescriptionsTable,
	casesTable,
	medicinesTable,
} from "@/db/case";
import { otpOverrideLogsTable } from "@/db/otp";
import { patientsTable } from "@/db/patient";
import { createStrictHono, strictValidator } from "@/lib/types/api";
import z from "zod";
import { db } from ".";
import { rbacCheck } from "./rbac";

const admin = createStrictHono()
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

		return c.json({ success: true, data: logs });
	})
	.get(
		"/analytics",
		strictValidator(
			"query",
			z.object({
				days: z.coerce.number().int().min(1).max(365).catch(30),
				topDiagnoses: z.coerce.number().int().min(1).max(100).catch(10),
				topMedicines: z.coerce.number().int().min(1).max(100).catch(10),
			}),
		),
		async (c) => {
			const {
				days,
				topDiagnoses: topDiagnosesLimit,
				topMedicines: topMedicinesLimit,
			} = c.req.valid("query");
			const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

			const topDiagnoses = (
				await db.execute<{ name: string; icd: string; count: number }>(sql`
					SELECT d.name, d.icd, CAST(COUNT(*) AS INTEGER) AS count
					FROM cases c
					CROSS JOIN LATERAL unnest(c.diagnosis) AS disease_id
					JOIN diseases d ON d.id = disease_id
					WHERE c.created_at >= ${since}
					  AND c.diagnosis IS NOT NULL
					GROUP BY d.id, d.name, d.icd
					ORDER BY count DESC
					LIMIT ${topDiagnosesLimit}
				`)
			).rows;

			// Most prescribed medicines
			const topMedicines = await db
				.select({
					name: medicinesTable.drug,
					brand: medicinesTable.brand,
					count: count(),
				})
				.from(casePrescriptionsTable)
				.innerJoin(
					medicinesTable,
					eq(casePrescriptionsTable.medicineId, medicinesTable.id),
				)
				.innerJoin(
					casesTable,
					eq(casePrescriptionsTable.caseId, casesTable.id),
				)
				.where(gte(casesTable.createdAt, since))
				.groupBy(medicinesTable.id, medicinesTable.drug, medicinesTable.brand)
				.orderBy(desc(count()))
				.limit(topMedicinesLimit);

			// Cases created per day over the period
			const casesOverTime = (
				await db.execute<{ date: string; count: number }>(sql`
					SELECT DATE(created_at)::text AS date, CAST(COUNT(*) AS INTEGER) AS count
					FROM cases
					WHERE created_at >= ${since}
					GROUP BY DATE(created_at)
					ORDER BY date ASC
				`)
			).rows;

			// Case type- opd,admitted,referred,in-progress
			const caseDispositions = await db
				.select({
					state: casesTable.finalizedState,
					count: count(),
				})
				.from(casesTable)
				.where(gte(casesTable.createdAt, since))
				.groupBy(casesTable.finalizedState);

			// Patient type distribution
			const patientTypeDist = await db
				.select({
					type: patientsTable.type,
					count: count(),
				})
				.from(patientsTable)
				.groupBy(patientsTable.type);

			return c.json({
				success: true,
				data: {
					topDiagnoses,
					topMedicines,
					casesOverTime,
					caseDispositions,
					patientTypeDist,
				},
			});
		},
	);

export default admin;
