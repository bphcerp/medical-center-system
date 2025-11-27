import "dotenv/config";
import { and, eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import z from "zod";
import { casesTable } from "@/db/case";
import { doctorCaseHistoryOtpsTable, otpOverrideLogsTable } from "@/db/otp";
import {
	dependentsTable,
	patientsTable,
	professorsTable,
	studentsTable,
	visitorsTable,
} from "@/db/patient";
import env from "@/lib/env";
import { createStrictHono, strictValidator } from "@/lib/types/api";
import { getAge } from "@/lib/utils";
import { db } from ".";
import { getCaseDetail } from "./doctor";
import { rbacCheck } from "./rbac";

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: env.EMAIL_USER,
		pass: env.EMAIL_PASS,
	},
});

const patientHistory = createStrictHono()
	.use(rbacCheck({ permissions: ["doctor"] }))
	.get("/:patientId", async (c) => {
		const patientId = Number(c.req.param("patientId"));

		const [patient] = await db
			.select({
				id: patientsTable.id,
				name: patientsTable.name,
				birthdate: patientsTable.birthdate,
				sex: patientsTable.sex,
				type: patientsTable.type,
			})
			.from(patientsTable)
			.where(eq(patientsTable.id, patientId))
			.limit(1);

		if (!patient) {
			return c.json(
				{ success: false, error: { message: "Patient not found" } },
				404,
			);
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
			success: true,
			data: {
				patient: {
					...patient,
					age: getAge(patient.birthdate),
				},
				cases,
			},
		});
	})
	.post(
		"/otp/:caseId/send",
		strictValidator(
			"param",
			z.object({ caseId: z.coerce.number().int().positive() }),
		),
		async (c) => {
			const { caseId } = c.req.valid("param");
			const payload = c.get("jwtPayload");
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
				return c.json(
					{ success: false, error: { message: "Case not found" } },
					404,
				);
			}

			// only allow OTP for finalized cases
			if (caseData.finalizedState === null) {
				return c.json(
					{
						success: false,
						error: { message: "OTP not required for active cases" },
					},
					400,
				);
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
				return c.json(
					{ success: false, error: { message: "Patient not found" } },
					404,
				);
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
				return c.json(
					{ success: false, error: { message: "Patient email not found" } },
					404,
				);
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

			return c.json({
				success: true,
				data: { message: "OTP sent successfully" },
			});
		},
	)
	.post(
		"/otp/:caseId/verify",
		strictValidator(
			"param",
			z.object({ caseId: z.coerce.number().int().positive() }),
		),
		strictValidator(
			"json",
			z.object({ otp: z.coerce.number().int().positive() }),
		),
		async (c) => {
			const { caseId } = c.req.valid("param");
			const { otp } = c.req.valid("json");
			const payload = c.get("jwtPayload");
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
				return c.json(
					{ success: false, error: { message: "Invalid OTP" } },
					400,
				);
			}

			const { caseDetail, prescriptions, diseases, tests } =
				await getCaseDetail(caseId);

			return c.json({
				success: true,
				data: { caseDetail, prescriptions, diseases, tests },
			});
		},
	)
	.post(
		"/otp/:caseId/override",
		strictValidator(
			"param",
			z.object({ caseId: z.coerce.number().int().positive() }),
		),
		strictValidator(
			"json",
			z.object({
				reason: z.string().min(10, "Reason must be at least 10 characters"),
			}),
		),
		async (c) => {
			const { caseId } = c.req.valid("param");
			const { reason } = c.req.valid("json");
			const payload = c.get("jwtPayload");
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
				return c.json(
					{ success: false, error: { message: "Case not found" } },
					404,
				);
			}

			if (caseData.finalizedState === null) {
				return c.json(
					{
						success: false,
						error: { message: "Override not required for active cases" },
					},
					400,
				);
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

			const { caseDetail, prescriptions, diseases, tests } =
				await getCaseDetail(caseId);

			return c.json({
				success: true,
				data: { caseDetail, prescriptions, diseases, tests },
			});
		},
	);

export default patientHistory;
