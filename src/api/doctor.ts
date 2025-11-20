import "dotenv/config";
import { zValidator } from "@hono/zod-validator";
import { and, arrayContains, eq, inArray, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import nodemailer from "nodemailer";
import z from "zod";
import env from "@/config/env";
import {
	casePrescriptionsTable,
	casesTable,
	diseasesTable,
	medicinesTable,
} from "@/db/case";
import { caseLabReportsTable, labTestsMasterTable } from "@/db/lab";
import { doctorCaseHistoryOtpsTable, otpOverrideLogsTable } from "@/db/otp";
import {
	dependentsTable,
	patientsTable,
	professorsTable,
	studentsTable,
	visitorsTable,
} from "@/db/patient";
import { db } from ".";
import type { JWTPayload } from "./auth";
import { rbacCheck } from "./rbac";

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: env.EMAIL_USER,
		pass: env.EMAIL_PASS,
	},
});

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
				patientId: patientsTable.id,
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
				consultationNotes: casesTable.consultationNotes,
				diagnosis: casesTable.diagnosis,
				associatedUsers: casesTable.associatedUsers,
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
			.orderBy(casesTable.id)
			.limit(1);

		const caseDetail = caseDetails[0];

		if (!caseDetail) {
			return c.json({ error: "Case not found" }, 404);
		}

		if (!caseDetail.associatedUsers?.includes(userId)) {
			return c.json({ error: "Unauthorized" }, 403);
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
					.array(
						z.object({
							medicineId: z.number().int(),
							dosage: z.string(),
							frequency: z.string(),
							duration: z.string(),
							comment: z.string().optional(),
							categoryData: z.record(z.string(), z.any()).optional(),
						}),
					)
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
						await tx.insert(casePrescriptionsTable).values(
							prescriptions.map((p) => ({
								caseId,
								medicineId: p.medicineId,
								dosage: p.dosage,
								frequency: p.frequency,
								duration: p.duration,
								comment: p.comment || null,
								categoryData: p.categoryData || null,
							})),
						);
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
	})
	.post(
		"/consultation/:caseId/send-otp",
		zValidator("param", z.object({ caseId: z.coerce.number() })),
		async (c) => {
			const { caseId } = c.req.valid("param");
			const payload = c.get("jwtPayload") as JWTPayload;
			const doctorId = payload.id;

			// Get case details
			const [caseData] = await db
				.select({
					id: casesTable.id,
					patientId: casesTable.patient,
					finalizedState: casesTable.finalizedState,
				})
				.from(casesTable)
				.where(eq(casesTable.id, caseId))
				.limit(1);

			if (!caseData) {
				return c.json({ error: "Case not found" }, 404);
			}

			// only allow OTP for finalized cases
			if (caseData.finalizedState === null) {
				return c.json({ error: "OTP not required for active cases" }, 400);
			}

			const patientId = caseData.patientId;

			const [patient] = await db
				.select({
					id: patientsTable.id,
					type: patientsTable.type,
				})
				.from(patientsTable)
				.where(eq(patientsTable.id, patientId))
				.limit(1);

			if (!patient) {
				return c.json({ error: "Patient not found" }, 404);
			}

			let patientEmail: string | null = null;

			switch (patient.type) {
				case "student": {
					const [student] = await db
						.select({ email: studentsTable.email })
						.from(studentsTable)
						.where(eq(studentsTable.patientId, patientId))
						.limit(1);
					patientEmail = student?.email || null;
					break;
				}
				case "professor": {
					const [professor] = await db
						.select({ email: professorsTable.email })
						.from(professorsTable)
						.where(eq(professorsTable.patientId, patientId))
						.limit(1);
					patientEmail = professor?.email || null;
					break;
				}
				case "dependent": {
					// For dependents, get the professor's email via PSRN
					const [dependent] = await db
						.select({ psrn: dependentsTable.psrn })
						.from(dependentsTable)
						.where(eq(dependentsTable.patientId, patientId))
						.limit(1);

					if (dependent?.psrn) {
						const [professor] = await db
							.select({ email: professorsTable.email })
							.from(professorsTable)
							.where(eq(professorsTable.psrn, dependent.psrn))
							.limit(1);
						patientEmail = professor?.email || null;
					}
					break;
				}
				case "visitor": {
					const [visitor] = await db
						.select({ email: visitorsTable.email })
						.from(visitorsTable)
						.where(eq(visitorsTable.patientId, patientId))
						.limit(1);
					patientEmail = visitor?.email || null;
					break;
				}
			}

			if (!patientEmail) {
				return c.json({ error: "Patient email not found" }, 404);
			}

			// gen 6 digit OTP
			const otp = Math.floor(100000 + Math.random() * 900000);

			await db
				.delete(doctorCaseHistoryOtpsTable)
				.where(
					and(
						eq(doctorCaseHistoryOtpsTable.doctorId, doctorId),
						eq(doctorCaseHistoryOtpsTable.caseId, caseId),
					),
				);

			await db.insert(doctorCaseHistoryOtpsTable).values({
				doctorId,
				caseId,
				otp,
			});

			await transporter.sendMail({
				from: env.EMAIL_USER,
				to: patientEmail,
				subject: "OTP for Accessing Case History",
				text: `A doctor is requesting access to view case history. Your OTP is: ${otp}. It is valid for a limited time.`,
			});

			return c.json({ message: "OTP sent successfully" });
		},
	)
	.post(
		"/consultation/:caseId/verify-otp",
		zValidator("param", z.object({ caseId: z.coerce.number() })),
		zValidator("json", z.object({ otp: z.coerce.number() })),
		async (c) => {
			const { caseId } = c.req.valid("param");
			const { otp } = c.req.valid("json");
			const payload = c.get("jwtPayload") as JWTPayload;
			const doctorId = payload.id;
			const otpRecord = await db
				.select()
				.from(doctorCaseHistoryOtpsTable)
				.where(
					and(
						eq(doctorCaseHistoryOtpsTable.doctorId, doctorId),
						eq(doctorCaseHistoryOtpsTable.caseId, caseId),
						eq(doctorCaseHistoryOtpsTable.otp, otp),
					),
				)
				.limit(1);

			if (otpRecord.length === 0) {
				return c.json({ error: "Invalid OTP" }, 400);
			}

			return c.json({
				success: true,
				message: "OTP verified successfully",
			});
		},
	)
	.post(
		"/consultation/:caseId/override-otp",
		zValidator("param", z.object({ caseId: z.coerce.number() })),
		zValidator(
			"json",
			z.object({
				reason: z.string().min(10, "Reason must be at least 10 characters"),
			}),
		),
		async (c) => {
			const { caseId } = c.req.valid("param");
			const { reason } = c.req.valid("json");
			const payload = c.get("jwtPayload") as JWTPayload;
			const doctorId = payload.id;

			// Get case details to verify it exists and is finalized
			const [caseData] = await db
				.select({
					id: casesTable.id,
					finalizedState: casesTable.finalizedState,
				})
				.from(casesTable)
				.where(eq(casesTable.id, caseId))
				.limit(1);

			if (!caseData) {
				return c.json({ error: "Case not found" }, 404);
			}

			if (caseData.finalizedState === null) {
				return c.json({ error: "Override not required for active cases" }, 400);
			}

			// log the override to audit table
			await db.insert(otpOverrideLogsTable).values({
				doctorId,
				caseId,
				reason,
			});

			const overrideOtp = 999999; // Special value to indicate override

			// del any existing OTPs for this doctor-case pair
			await db
				.delete(doctorCaseHistoryOtpsTable)
				.where(
					and(
						eq(doctorCaseHistoryOtpsTable.doctorId, doctorId),
						eq(doctorCaseHistoryOtpsTable.caseId, caseId),
					),
				);

			await db.insert(doctorCaseHistoryOtpsTable).values({
				doctorId,
				caseId,
				otp: overrideOtp,
			});

			return c.json({
				success: true,
				message: "Access override granted and logged",
			});
		},
	);

export default doctor;
