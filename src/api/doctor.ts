import "dotenv/config";
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
import { createStrictHono, strictValidator } from "@/lib/types/api";
import { getAge } from "@/lib/utils";
import { db } from ".";
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

	// Fetch tests if tests prescribed
	const tests = await db
		.select({
			id: labTestsMasterTable.id,
			name: labTestsMasterTable.name,
			category: labTestsMasterTable.category,
		})
		.from(caseLabReportsTable)
		.innerJoin(
			labTestsMasterTable,
			eq(caseLabReportsTable.testId, labTestsMasterTable.id),
		)
		.where(eq(caseLabReportsTable.caseId, caseId));

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
		tests,
	};
};

const doctor = createStrictHono()
	.use(rbacCheck({ permissions: ["doctor"] }))
	.get("/queue", async (c) => {
		const payload = c.get("jwtPayload");
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
			.where(
				and(
					arrayContains(casesTable.associatedUsers, [userId]),
					isNull(casesTable.finalizedState),
				),
			)
			.orderBy(casesTable.id);

		const queue = cases.map((c) => {
			return {
				caseId: c.caseId,
				patientName: c.patientName,
				patientAge: getAge(c.patientsBirthdate),
				patientSex: c.patientSex,
				token: c.token,
				status: "Waiting for Consultation",
			};
		});

		return c.json({ success: true, data: queue });
	})
	.get("/consultation/:caseId", async (c) => {
		const payload = c.get("jwtPayload");
		const userId = payload.id;
		const caseId = Number(c.req.param("caseId"));

		const { caseDetail, prescriptions, diseases, tests } =
			await getCaseDetail(caseId);

		if (!caseDetail) {
			return c.json(
				{
					success: false,
					error: { message: "Case not found", details: { caseId } },
				},
				404,
			);
		}

		if (!caseDetail.cases.associatedUsers.includes(userId)) {
			return c.json(
				{ success: false, error: { message: "Unauthorized" } },
				403,
			);
		}

		if (caseDetail.cases.finalizedState !== null) {
			return c.json(
				{
					success: false,
					error: {
						message: "Case is finalized. Access via OTP required.",
						details: { caseId },
					},
				},
				400,
			);
		}

		return c.json({
			success: true,
			data: { caseDetail, prescriptions, diseases, tests },
		});
	})
	.get("/medicines", async (c) => {
		const medicines = await db.select().from(medicinesTable);

		if (medicines.length === 0) {
			return c.json(
				{
					success: false,
					error: {
						message: "Medicines data not found",
					},
				},
				404,
			);
		}

		return c.json({ success: true, data: medicines });
	})
	.get("/diseases", async (c) => {
		const diseases = await db.select().from(diseasesTable);

		if (diseases.length === 0) {
			return c.json(
				{ success: false, error: { message: "Diseases data not found" } },
				404,
			);
		}

		return c.json({ success: true, data: diseases });
	})
	.get("/tests", async (c) => {
		const activeTests = await db
			.select({
				id: labTestsMasterTable.id,
				testCode: labTestsMasterTable.testCode,
				name: labTestsMasterTable.name,
				category: labTestsMasterTable.category,
			})
			.from(labTestsMasterTable)
			.where(eq(labTestsMasterTable.isActive, true));

		return c.json({ success: true, data: activeTests });
	})
	.post(
		"/autosave",
		strictValidator(
			"json",
			z.object({
				caseId: z.number().int().positive(),
				consultationNotes: z.string().optional(),
				// Allow empty array to clear diagnosis, tests and prescriptions
				diagnosis: z.array(z.number().int().positive()).optional(),
				prescriptions: z
					.array(createInsertSchema(casePrescriptionsTable))
					.optional(),
				tests: z.array(z.number().int().positive()).optional(),
			}),
		),
		async (c) => {
			const payload = c.get("jwtPayload");
			const userId = payload.id;
			const { caseId, consultationNotes, prescriptions, diagnosis, tests } =
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
					return c.json(
						{ success: false, error: { message: "Case not found" } },
						404,
					);
				}

				if (prescriptions !== undefined) {
					await tx
						.delete(casePrescriptionsTable)
						.where(eq(casePrescriptionsTable.caseId, caseId));

					if (prescriptions.length > 0) {
						await tx.insert(casePrescriptionsTable).values(prescriptions);
					}
				}

				if (tests !== undefined) {
					const validTests = await tx
						.select({ id: labTestsMasterTable.id })
						.from(labTestsMasterTable)
						.where(
							and(
								inArray(labTestsMasterTable.id, tests),
								eq(labTestsMasterTable.isActive, true),
							),
						);

					if (validTests.length !== tests.length) {
						return c.json(
							{
								success: false,
								error: {
									message: "Some test IDs are invalid",
									details: {
										invalidTestIds: tests.filter(
											(id) => !validTests.some((test) => test.id === id),
										),
									},
								},
							},
							400,
						);
					}

					await tx
						.delete(caseLabReportsTable)
						.where(eq(caseLabReportsTable.caseId, caseId));

					if (tests.length > 0) {
						await tx.insert(caseLabReportsTable).values(
							tests.map((testId) => ({
								caseId,
								testId,
								status: "Requested" as const,
							})),
						);
					}
				}
			});

			return c.json({
				success: true,
				data: { message: "Case data saved successfully" },
			});
		},
	)
	.post(
		"/finalizeCase",
		strictValidator(
			"json",
			z.object({
				caseId: z.number().int().positive(),
				finalizedState: z.enum(["opd", "admitted", "referred"]),
			}),
		),
		async (c) => {
			const payload = c.get("jwtPayload");
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
				return c.json(
					{
						success: false,
						error: { message: "Case not found or already finalized" },
					},
					404,
				);
			}

			return c.json({
				success: true,
				data: {
					message: "Case finalized successfully",
				},
			});
		},
	);

export default doctor;
