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
import { rolesTable, usersTable } from "src/db/auth";
import {
	doctorAvailabilityTypeEnum,
	doctorScheduleTable,
	doctorSpecialitiesTable,
	doctorsTable,
} from "src/db/doctor";
import { dayOfWeekEnum } from "src/db/utils";
import z from "zod";
import {
	casePrescriptionsTable,
	casesTable,
	categoryDataSchema,
	diseasesTable,
	medicinesTable,
} from "@/db/case";
import { filesTable } from "@/db/files";
import {
	caseLabReportsTable,
	labTestFilesTable,
	labTestsMasterTable,
	type statusEnums,
} from "@/db/lab";
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
import speciality from "./speciality";
import { getPermissionsForUser } from "./utils";

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

	// Fetch test status and files
	const testDetails = await db
		.select({
			id: caseLabReportsTable.id,
			fileId: labTestFilesTable.fileId,
			filename: filesTable.filename,
			status: caseLabReportsTable.status,
			name: labTestsMasterTable.name,
			category: labTestsMasterTable.category,
		})
		.from(caseLabReportsTable)
		.innerJoin(
			labTestsMasterTable,
			eq(caseLabReportsTable.testId, labTestsMasterTable.id),
		)
		.innerJoin(casesTable, eq(caseLabReportsTable.caseId, casesTable.id))
		.leftJoin(
			labTestFilesTable,
			eq(caseLabReportsTable.id, labTestFilesTable.caseLabReportId),
		)
		.leftJoin(filesTable, eq(labTestFilesTable.fileId, filesTable.id))
		.where(eq(caseLabReportsTable.caseId, caseId));

	interface TestDetail {
		id: number;
		status: (typeof statusEnums)[number];
		name: string;
		category: string;
		files: FileDetail[];
	}

	interface FileDetail {
		id: number;
		filename: string;
	}

	const testMap = new Map<number, TestDetail>();
	for (const test of testDetails) {
		if (!testMap.has(test.id)) {
			testMap.set(test.id, {
				id: test.id,
				name: test.name,
				status: test.status,
				category: test.category,
				files: [],
			});
		}
		if (test.fileId !== null) {
			testMap.get(test.id)?.files.push({
				id: test.fileId,
				filename: test.filename ?? "Unknown file",
			});
		}
	}
	const tests = Array.from(testMap.values());

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

export type Doctor =
	(typeof doctor._schema)["/all"]["$get"]["output"]["data"][number];

const doctor = createStrictHono()
	.route("/speciality", speciality)
	// TODO: not everybody should be able to view
	// all doctors, there should be a permission for this
	.get("/all", async (c) => {
		const doctors = await db
			.select({
				id: doctorsTable.id,
				name: usersTable.name,
				username: usersTable.username,
				specialityId: doctorsTable.specialityId,
				specialityName: doctorSpecialitiesTable.name,
				specialityIsActive: doctorSpecialitiesTable.isActive,
				availabilityType: doctorsTable.availabilityType,
			})
			.from(doctorsTable)
			.innerJoin(usersTable, eq(usersTable.id, doctorsTable.id))
			.innerJoin(
				doctorSpecialitiesTable,
				eq(doctorSpecialitiesTable.id, doctorsTable.specialityId),
			);

		return c.json({ success: true, data: doctors });
	})
	// These endpoints are for admin use only. Doctor endpoints come afterwards
	.get("/unassigned", rbacCheck({ permissions: ["admin"] }), async (c) => {
		const doctors = await db
			.select({
				id: usersTable.id,
				name: usersTable.name,
				username: usersTable.username,
			})
			.from(usersTable)
			.innerJoin(rolesTable, eq(usersTable.role, rolesTable.id))
			.leftJoin(doctorsTable, eq(usersTable.id, doctorsTable.id))
			.where(
				and(
					arrayContains(rolesTable.allowed, ["doctor"]),
					isNull(doctorsTable.id),
				),
			);

		return c.json({ success: true, data: doctors });
	})
	.post(
		"/:doctorId",
		rbacCheck({ permissions: ["admin"] }),
		strictValidator(
			"param",
			z.object({
				doctorId: z.coerce.number().int().positive(),
			}),
		),
		strictValidator(
			"json",
			z.object({
				specialityId: z.number().int().positive(),
				availabilityType: z.enum(doctorAvailabilityTypeEnum.enumValues),
			}),
		),
		async (c) => {
			const { doctorId: id } = c.req.valid("param");

			if (!(await isDoctor(id))) {
				return c.json(
					{ success: false, error: { message: "User is not a doctor" } },
					400,
				);
			}

			const { specialityId, availabilityType } = c.req.valid("json");

			const [assigned] = await db
				.insert(doctorsTable)
				.values({ id, specialityId, availabilityType })
				.onConflictDoUpdate({
					target: doctorsTable.id,
					set: { specialityId, availabilityType },
				})
				.returning();

			return c.json({ success: true, data: assigned });
		},
	)
	.get(
		"/:doctorId/schedule",
		rbacCheck({ permissions: ["admin"] }),
		strictValidator(
			"param",
			z.object({ doctorId: z.coerce.number().int().positive() }),
		),
		async (c) => {
			const { doctorId } = c.req.valid("param");

			const templates = await db
				.select()
				.from(doctorScheduleTable)
				.where(eq(doctorScheduleTable.doctorId, doctorId))
				.orderBy(doctorScheduleTable.dayOfWeek, doctorScheduleTable.startTime);

			return c.json({ success: true, data: templates });
		},
	)
	.put(
		"/:doctorId/schedule",
		rbacCheck({ permissions: ["admin"] }),
		strictValidator(
			"param",
			z.object({ doctorId: z.coerce.number().int().positive() }),
		),
		strictValidator(
			"json",
			z.object({
				slots: z
					.array(
						z.object({
							dayOfWeek: z.enum(dayOfWeekEnum.enumValues),
							startTime: z.iso.time(),
							endTime: z.iso.time(),
							slotDurationMinutes: z.number().int().positive(),
						}),
					)
					.min(1),
			}),
		),
		async (c) => {
			const { doctorId } = c.req.valid("param");
			const { slots } = c.req.valid("json");

			await db.transaction(async (tx) => {
				await tx
					.delete(doctorScheduleTable)
					.where(eq(doctorScheduleTable.doctorId, doctorId));

				await tx
					.insert(doctorScheduleTable)
					.values(slots.map((s) => ({ doctorId, ...s })));
			});

			return c.json({ success: true, data: null });
		},
	)
	// These endpoints are for doctor use only
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

		if (
			caseDetail.cases.finalizedState !== null &&
			!caseDetail.cases.associatedUsers.includes(userId)
		) {
			return c.json(
				{
					success: false,
					error: { message: "OTP required", details: { caseId } },
				},
				400,
			);
		}

		if (!caseDetail.cases.associatedUsers.includes(userId)) {
			return c.json(
				{ success: false, error: { message: "Unauthorized" } },
				403,
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

const isDoctor = async (id: number) => {
	const perms = await getPermissionsForUser(id);
	return perms.includes("doctor");
};

export default doctor;
