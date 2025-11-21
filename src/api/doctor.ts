import "dotenv/config";
import { zValidator } from "@hono/zod-validator";
import {
	and,
	arrayContains,
	eq,
	getTableColumns,
	inArray,
	isNull,
	sql,
} from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { Hono } from "hono";
import z from "zod";
import {
	casePrescriptionsTable,
	casesTable,
	categoryDataSchema,
	diseasesTable,
	medicinesTable,
} from "@/db/case";
import { caseLabReportsTable, labTestsMasterTable } from "@/db/lab";
import {
	dependentsTable,
	patientsTable,
	professorsTable,
	studentsTable,
	visitorsTable,
} from "@/db/patient";
import { getAge } from "@/lib/utils";
import { db } from ".";
import type { JWTPayload } from "./auth";
import { rbacCheck } from "./rbac";

export const getCaseDetail = async (caseId: number) => {
	const caseDetails = await db
		.select({
			cases: casesTable,
			patient: patientsTable,
			identifier: sql<string>`
				COALESCE(${professorsTable.psrn},
						${studentsTable.studentId},
						${visitorsTable.phone},
						${dependentsTable.psrn})`,
		})
		.from(casesTable)
		.innerJoin(patientsTable, eq(casesTable.patient, patientsTable.id))
		.leftJoin(professorsTable, eq(professorsTable.patientId, patientsTable.id))
		.leftJoin(studentsTable, eq(studentsTable.patientId, patientsTable.id))
		.leftJoin(visitorsTable, eq(visitorsTable.patientId, patientsTable.id))
		.leftJoin(dependentsTable, eq(dependentsTable.patientId, patientsTable.id))
		.where(eq(casesTable.id, caseId))
		.orderBy(casesTable.id)
		.limit(1);

	const caseDetail = caseDetails[0];

	// Fetch prescriptions
	const {
		caseId: _caseId,
		id: _id,
		medicineId: _medicineId,
		...prescriptionCols
	} = getTableColumns(casePrescriptionsTable);

	const unparsedPrescriptions = await db
		.select({
			medicines: medicinesTable,
			case_prescriptions: {
				...prescriptionCols,
			},
		})
		.from(casePrescriptionsTable)
		.innerJoin(
			medicinesTable,
			eq(casePrescriptionsTable.medicineId, medicinesTable.id),
		)
		.where(eq(casePrescriptionsTable.caseId, caseId));

	const prescriptions = unparsedPrescriptions.map((prescription) => ({
		...prescription,
		case_prescriptions: {
			...prescription.case_prescriptions,
			categoryData: prescription.case_prescriptions.categoryData
				? categoryDataSchema.parse(prescription.case_prescriptions.categoryData)
				: null,
		},
	}));

	// Fetch diseases if diagnosis exists
	let diseases: Array<{ id: number; name: string; icd: string }> = [];
	if (caseDetail.cases.diagnosis && caseDetail.cases.diagnosis.length > 0) {
		diseases = await db
			.select({
				id: diseasesTable.id,
				name: diseasesTable.name,
				icd: diseasesTable.icd,
			})
			.from(diseasesTable)
			.where(inArray(diseasesTable.id, caseDetail.cases.diagnosis));
	}
	return {
		caseDetail: {
			...caseDetail,
			patient: {
				...caseDetail.patient,
				age: getAge(caseDetail.patient.birthdate),
			},
		},
		prescriptions,
		diseases,
	};
};

const doctor = new Hono()
	.use(rbacCheck({ permissions: ["doctor"] }))
	.get("/queue", async (c) => {
		const payload = c.get("jwtPayload") as JWTPayload;
		const userId = payload.id;

		const cases = await db
			.select({
				caseId: casesTable.id,
				patientName: patientsTable.name,
				patientsBirthdate: patientsTable.birthdate,
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
					const hasComplete = reports.some((r) => r.status === "Complete");
					const hasInProgress = reports.some(
						(r) => r.status === "Sample Collected",
					);
					const hasRequested = reports.some((r) => r.status === "Requested");

					if (hasComplete) {
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
					patientAge: getAge(c.patientsBirthdate),
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

		const { caseDetail, prescriptions, diseases } = await getCaseDetail(caseId);

		if (!caseDetail) {
			return c.json({ error: "Case not found" }, 404);
		}

		if (!caseDetail.cases.associatedUsers?.includes(userId)) {
			return c.json({ error: "Unauthorized" }, 403);
		}

		if (caseDetail.cases.finalizedState !== null) {
			return c.json(
				{
					error: "Case is finalized. Access via OTP required.",
				},
				400,
			);
		}

		return c.json({ caseDetail, prescriptions, diseases });
	})
	.get("/medicines", async (c) => {
		const medicines = await db.select().from(medicinesTable);

		if (medicines.length === 0) {
			return c.json({ error: "Medicines data not found" }, 404);
		}

		return c.json({ medicines });
	})
	.get("/diseases", async (c) => {
		const diseases = await db.select().from(diseasesTable);

		if (diseases.length === 0) {
			return c.json({ error: "Diseases data not found" }, 404);
		}

		return c.json({ diseases });
	})
	.post(
		"/autosave",
		zValidator(
			"json",
			z.object({
				caseId: z.number().int(),
				consultationNotes: z.string().optional(),
				diagnosis: z.array(z.number().int()).optional(),
				prescriptions: z
					.array(createInsertSchema(casePrescriptionsTable))
					.optional(),
			}),
		),
		async (c) => {
			const payload = c.get("jwtPayload") as JWTPayload;
			const userId = payload.id;
			const { caseId, consultationNotes, prescriptions, diagnosis } =
				c.req.valid("json");

			await db.transaction(async (tx) => {
				const updated = await tx
					.update(casesTable)
					.set({
						...(consultationNotes !== undefined ? { consultationNotes } : {}),
						...(diagnosis !== undefined ? { diagnosis } : {}),
					})
					.where(
						and(
							eq(casesTable.id, caseId),
							arrayContains(casesTable.associatedUsers, [userId]),
							isNull(casesTable.finalizedState),
						),
					)
					.returning();

				if (updated.length === 0) {
					return c.json({ error: "Case not found" }, 404);
				}

				if (prescriptions !== undefined) {
					await tx
						.delete(casePrescriptionsTable)
						.where(eq(casePrescriptionsTable.caseId, caseId));

					if (prescriptions.length > 0) {
						await tx.insert(casePrescriptionsTable).values(prescriptions);
					}
				}
			});

			return c.json({
				success: true,
				message: "Case data saved successfully",
			});
		},
	)
	.post(
		"/finalizeCase",
		zValidator(
			"json",
			z.object({
				caseId: z.number().int(),
				finalizedState: z.enum(["opd", "admitted", "referred"]),
			}),
		),
		async (c) => {
			const payload = c.get("jwtPayload") as JWTPayload;
			const userId = payload.id;
			const { caseId, finalizedState } = c.req.valid("json");

			const updated = await db
				.update(casesTable)
				.set({ finalizedState })
				.where(
					and(
						eq(casesTable.id, caseId),
						arrayContains(casesTable.associatedUsers, [userId]),
						isNull(casesTable.finalizedState),
					),
				)
				.returning();

			if (updated.length === 0) {
				return c.json({ error: "Case not found or already finalized" }, 404);
			}

			return c.json({
				success: true,
				message: "Case finalized successfully",
			});
		},
	)
	.post(
		"/requestLabTests",
		zValidator(
			"json",
			z.object({
				caseId: z.number().int(),
				testIds: z.array(z.number().int()).min(1),
			}),
		),
		async (c) => {
			const payload = c.get("jwtPayload") as JWTPayload;
			const userId = payload.id;
			const { caseId, testIds } = c.req.valid("json");

			//is it the docs caase????
			const [caseExists] = await db
				.select({ id: casesTable.id })
				.from(casesTable)
				.where(
					and(
						eq(casesTable.id, caseId),
						arrayContains(casesTable.associatedUsers, [userId]),
					),
				)
				.limit(1);

			if (!caseExists) {
				return c.json({ error: "Case not found" }, 404);
			}
			const validTests = await db
				.select({ id: labTestsMasterTable.id })
				.from(labTestsMasterTable)
				.where(
					and(
						inArray(labTestsMasterTable.id, testIds),
						eq(labTestsMasterTable.isActive, true),
					),
				);

			if (validTests.length !== testIds.length) {
				return c.json({ error: "Some test IDs are invalid" }, 400);
			}

			await db.insert(caseLabReportsTable).values(
				testIds.map((testId) => ({
					caseId,
					testId,
					status: "Requested" as const,
				})),
			);

			return c.json({
				success: true,
				message: "Lab tests requested successfully",
			});
		},
	)
	.get("/tests", async (c) => {
		const activeTests = await db
			.select({
				id: labTestsMasterTable.id,
				name: labTestsMasterTable.name,
				description: labTestsMasterTable.description,
				category: labTestsMasterTable.category,
			})
			.from(labTestsMasterTable)
			.where(eq(labTestsMasterTable.isActive, true));

		return c.json({ success: true, tests: activeTests });
	});

export default doctor;
