import "dotenv/config";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import nodemailer from "nodemailer";
import z from "zod";
import env from "@/config/env";
import { casesTable } from "@/db/case";
import { doctorCaseHistoryOtpsTable } from "@/db/otp";
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

const patientHistory = new Hono()
	.use(rbacCheck({ permissions: ["doctor"] }))
	.post(
		"/:patientId",
		zValidator("json", z.object({ otp: z.coerce.number() })),
		async (c) => {
			const { otp } = c.req.valid("json");
			const payload = c.get("jwtPayload") as JWTPayload;
			const doctorId = payload.id;
			const patientId = Number(c.req.param("patientId"));

			if (
				(await db.$count(
					doctorCaseHistoryOtpsTable,
					and(
						eq(doctorCaseHistoryOtpsTable.patientId, patientId),
						eq(doctorCaseHistoryOtpsTable.otp, otp),
						eq(doctorCaseHistoryOtpsTable.doctorId, doctorId),
					),
				)) === 0
			) {
				return c.json({ error: "Invalid OTP" }, 400);
			}

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
		},
	)
	.post("/:patientId/send-otp", async (c) => {
		// 6 digit otp
		const otp = Math.floor(100000 + Math.random() * 900000);
		const payload = c.get("jwtPayload") as JWTPayload;
		const patientId = Number(c.req.param("patientId"));

		// Get patient details to determine type
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

		// Fetch email based on patient type
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

		// delete any existing otps for this doctor-patient pair
		await db
			.delete(doctorCaseHistoryOtpsTable)
			.where(
				and(
					eq(doctorCaseHistoryOtpsTable.doctorId, payload.id),
					eq(doctorCaseHistoryOtpsTable.patientId, patientId),
				),
			);

		// store new otp
		await db.insert(doctorCaseHistoryOtpsTable).values({
			doctorId: payload.id,
			patientId,
			otp,
		});

		// Send OTP via email
		await transporter.sendMail({
			from: env.EMAIL_USER,
			to: patientEmail,
			subject: "Your OTP for Accessing Patient History",
			text: `Your OTP for accessing patient history is: ${otp}. It is valid for a limited time.`,
		});

		return c.json({ message: "OTP sent successfully" });
	});

export default patientHistory;
