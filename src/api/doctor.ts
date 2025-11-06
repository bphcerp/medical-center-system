import "dotenv/config";
import { arrayContains, eq, inArray, and, sql } from "drizzle-orm";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { casesTable, medicinesTable } from "@/db/case";
import { caseLabReportsTable } from "@/db/lab";
import {
	dependentsTable,
	patientsTable,
	professorsTable,
	studentsTable,
	visitorsTable,
} from "@/db/patient";
import { db } from ".";
import { rbacCheck } from "./rbac";
import type { JWTPayload } from "./auth";

const doctor = new Hono()
	.use(rbacCheck({ permissions: ["doctor"] }))
	.get("/queue", async (c) => {
		const payload = c.get("jwtPayload") as JWTPayload;
		const userId = payload.id;

		const cases = await db
			.select({
				caseId: casesTable.id,
				patientName: patientsTable.name,
				patientAge: patientsTable.age,
				patientSex: patientsTable.sex,
				token: casesTable.token,
				finalizedState: casesTable.finalizedState,
			})
			.from(casesTable)
			.innerJoin(patientsTable, eq(casesTable.patient, patientsTable.id))
			.where(arrayContains(casesTable.associatedUsers, [userId]))
			.orderBy(casesTable.id);

		const caseIds = cases.map((c) => c.caseId);
		const labReports =
			caseIds.length > 0
				? await db
						.select({
							caseId: caseLabReportsTable.caseId,
							status: caseLabReportsTable.status,
						})
						.from(caseLabReportsTable)
						.where(inArray(caseLabReportsTable.caseId, caseIds))
				: [];

		const queue = cases
			.filter((c) => !c.finalizedState) //only show non-finalized cases
			.map((c) => {
				const reports = labReports.filter((r) => r.caseId === c.caseId);
				let status:
					| "Waiting for Consultation"
					| "Lab Results Ready"
					| "Lab Tests in Progress"
					| "Lab Tests Requested" = "Waiting for Consultation";

				if (reports.length > 0) {
					const hasDone = reports.some((r) => r.status === "Done");
					const hasInProgress = reports.some((r) => r.status === "In Progress");
					const hasRequested = reports.some((r) => r.status === "Requested");

					if (hasDone) {
						status = "Lab Results Ready";
					} else if (hasInProgress) {
						status = "Lab Tests in Progress";
					} else if (hasRequested) {
						status = "Lab Tests Requested";
					}
				}

				return {
					caseId: c.caseId,
					patientName: c.patientName,
					patientAge: c.patientAge,
					patientSex: c.patientSex,
					token: c.token,
					status,
				};
			});

		return c.json({ queue });
	})
	.get("/consultation/:caseId", async (c) => {
		const payload = c.get("jwtPayload") as JWTPayload;
		const userId = payload.id;
		const caseId = Number(c.req.param("caseId"));

		const caseDetails = await db
			.select({
				caseId: casesTable.id,
				token: casesTable.token,
				finalizedState: casesTable.finalizedState,
				patientName: patientsTable.name,
				patientAge: patientsTable.age,
				patientSex: patientsTable.sex,
				patientType: patientsTable.type,
				identifier: sql<string>`
				COALESCE(${professorsTable.psrn},
						${studentsTable.studentId},
						${visitorsTable.phone},
						${dependentsTable.psrn})`,
				weight: casesTable.weight,
				temperature: casesTable.temperature,
				heartRate: casesTable.heartRate,
				respiratoryRate: casesTable.respiratoryRate,
				bloodPressureSystolic: casesTable.bloodPressureSystolic,
				bloodPressureDiastolic: casesTable.bloodPressureDiastolic,
				bloodSugar: casesTable.bloodSugar,
				spo2: casesTable.spo2,
			})
			.from(casesTable)
			.innerJoin(patientsTable, eq(casesTable.patient, patientsTable.id))
			.leftJoin(
				professorsTable,
				eq(professorsTable.patientId, patientsTable.id),
			)
			.leftJoin(studentsTable, eq(studentsTable.patientId, patientsTable.id))
			.leftJoin(visitorsTable, eq(visitorsTable.patientId, patientsTable.id))
			.leftJoin(
				dependentsTable,
				eq(dependentsTable.patientId, patientsTable.id),
			)
			.where(
				and(
					eq(casesTable.id, caseId),
					arrayContains(casesTable.associatedUsers, [userId]),
				),
			)
			.orderBy(casesTable.id)
			.limit(1);

		const caseDetail = caseDetails[0];

		if (!caseDetail) {
			return c.json({ error: "Case not found" }, 404);
		}

		return c.json({ caseDetail });
	})
	.get("/medicines", async (c) => {
		const medicines = await db
			.select({
				id: sql<number>`MIN(${medicinesTable.id})`.as("id"),
				drug: medicinesTable.drug,
				brand: medicinesTable.brand,
				type: medicinesTable.type,
			})
			.from(medicinesTable)
			.groupBy(
				medicinesTable.drug,
				medicinesTable.brand,
				medicinesTable.type
			);

		if (medicines.length === 0) {
			return c.json({ error: "Medicines data not found" }, 404);
		}

		return c.json({ medicines });
	})
	.post(
		"updateCaseFinalizedState",
		zValidator(
			"json",
			z.object({
				caseId: z.number().int(),
				finalizedState: z.enum(["opd", "admitted", "referred"]),
			}),
		),
		async (c) => {
			const { caseId, finalizedState } = c.req.valid("json");
			const updated = await db
				.update(casesTable)
				.set({
					finalizedState,
				})
				.where(eq(casesTable.id, caseId))
				.returning();

			if (updated.length === 0) {
				return c.json({ success: false, message: "Case not found" }, 404);
			}

			return c.json({
				success: true,
				message: "Finalized state updated successfully",
				case: updated[0],
			});
		},
	);

export default doctor;
