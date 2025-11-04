import "dotenv/config";
import { arrayContains, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { casesTable } from "@/db/case";
import { caseLabReportsTable } from "@/db/lab";
import { patientsTable } from "@/db/patient";
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
	});

export default doctor;
