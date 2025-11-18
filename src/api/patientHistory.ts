import "dotenv/config";
import { eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import {
	casePrescriptionsTable,
	casesTable,
	diseasesTable,
	medicinesTable,
} from "@/db/case";
import {
	dependentsTable,
	patientsTable,
	professorsTable,
	studentsTable,
	visitorsTable,
} from "@/db/patient";
import { db } from ".";
// import type { JWTPayload } from "./auth"; // might need this later
import { rbacCheck } from "./rbac";

const patientHistory = new Hono()
	.use(rbacCheck({ permissions: ["doctor"] }))
	.get("/:patientId", async (c) => {
		const patientId = Number(c.req.param("patientId"));

		const [patient] = await db
			.select({
				id: patientsTable.id,
				name: patientsTable.name,
				age: patientsTable.age,
				sex: patientsTable.sex,
				type: patientsTable.type,
			})
			.from(patientsTable)
			.where(eq(patientsTable.id, patientId))
			.limit(1);

		if (!patient) {
			return c.json({ error: "Patient not found" }, 404);
		}

		const cases = await db
			.select({
				caseId: casesTable.id,
				finalizedState: casesTable.finalizedState,
				createdAt: casesTable.createdAt,
				updatedAt: casesTable.updatedAt,
			})
			.from(casesTable)
			.where(eq(casesTable.patient, patientId))
			.orderBy(casesTable.id);

		return c.json({
			patient,
			cases,
		});
	})
	.get("/:patientId/:caseId", async (c) => {
		const patientId = Number(c.req.param("patientId"));
		const caseId = Number(c.req.param("caseId"));

		try {
			const caseDetails = await db
				.select({
					caseId: casesTable.id,
					token: casesTable.token,
					finalizedState: casesTable.finalizedState,
					patientId: patientsTable.id,
					patientName: patientsTable.name,
					patientAge: patientsTable.age,
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
					consultationNotes: casesTable.consultationNotes,
					diagnosis: casesTable.diagnosis,
					createdAt: casesTable.createdAt,
					updatedAt: casesTable.updatedAt,
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
				.where(eq(casesTable.id, caseId))
				.limit(1);

			const caseDetail = caseDetails[0];

			if (!caseDetail) {
				return c.json({ error: "Case not found" }, 404);
			}

			if (caseDetail.patientId !== patientId) {
				return c.json({ error: "Case does not belong to this patient" }, 400);
			}

			// Fetch prescriptions
			const prescriptions = await db
				.select({
					id: casePrescriptionsTable.id,
					medicineId: medicinesTable.id,
					drug: medicinesTable.drug,
					company: medicinesTable.company,
					brand: medicinesTable.brand,
					strength: medicinesTable.strength,
					type: medicinesTable.type,
					category: medicinesTable.category,
					dosage: casePrescriptionsTable.dosage,
					frequency: casePrescriptionsTable.frequency,
					duration: casePrescriptionsTable.duration,
					categoryData: casePrescriptionsTable.categoryData,
					comments: casePrescriptionsTable.comment,
				})
				.from(casePrescriptionsTable)
				.innerJoin(
					medicinesTable,
					eq(casePrescriptionsTable.medicineId, medicinesTable.id),
				)
				.where(eq(casePrescriptionsTable.caseId, caseId));

			// Fetch diseases if diagnosis exists
			let diseases: Array<{ id: number; name: string; icd: string }> = [];
			if (caseDetail.diagnosis && caseDetail.diagnosis.length > 0) {
				diseases = await db
					.select({
						id: diseasesTable.id,
						name: diseasesTable.name,
						icd: diseasesTable.icd,
					})
					.from(diseasesTable)
					.where(inArray(diseasesTable.id, caseDetail.diagnosis));
			}

			return c.json({
				caseDetail,
				prescriptions,
				diseases,
			});
		} catch (error) {
			console.error("Error fetching case details:", error);
			return c.json(
				{
					error: "Failed to fetch case details",
					details: error instanceof Error ? error.message : String(error),
				},
				500,
			);
		}
	});

export default patientHistory;
