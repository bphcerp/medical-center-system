import "dotenv/config";
import { and, eq, ilike, max, or, sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import z from "zod";
import { usersTable } from "@/db/auth";
import { appointmentStatusEnum, appointmentsTable } from "@/db/booking";
import { unprocessedTable } from "@/db/case";
import {
	doctorScheduleOverridesTable,
	doctorScheduleTable,
	doctorSpecialitiesTable,
	doctorsTable,
} from "@/db/doctor";
import {
	dependentsTable,
	patientsTable,
	professorsTable,
	studentsTable,
	visitorsTable,
} from "@/db/patient";
import env from "@/lib/env";
import { createStrictHono, strictValidator } from "@/lib/types/api";
import { daysOfWeek } from "@/lib/types/day";
import { db } from ".";
import { rbacCheck } from "./rbac";

function generateSlots(
	startTime: string,
	endTime: string,
	durationMinutes: number,
): { slotStart: string; slotEnd: string }[] {
	const slots: { slotStart: string; slotEnd: string }[] = [];
	const [sh, sm] = startTime.split(":").map(Number);
	const [eh, em] = endTime.split(":").map(Number);
	let cursor = sh * 60 + sm;
	const end = eh * 60 + em;
	while (cursor + durationMinutes <= end) {
		const slotStart = `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`;
		const next = cursor + durationMinutes;
		const slotEnd = `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
		slots.push({ slotStart, slotEnd });
		cursor = next;
	}
	return slots;
}

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: env.EMAIL_USER,
		pass: env.EMAIL_PASS,
	},
});

// get patient email based on patient type
async function getPatientEmail(patientId: number): Promise<string | null> {
	const [patient] = await db
		.select({ id: patientsTable.id, type: patientsTable.type })
		.from(patientsTable)
		.where(eq(patientsTable.id, patientId))
		.limit(1);

	if (!patient) return null;

	switch (patient.type) {
		case "student": {
			const [s] = await db
				.select({ email: studentsTable.email })
				.from(studentsTable)
				.where(eq(studentsTable.patientId, patientId))
				.limit(1);
			return s?.email || null;
		}
		case "professor": {
			const [p] = await db
				.select({ email: professorsTable.email })
				.from(professorsTable)
				.where(eq(professorsTable.patientId, patientId))
				.limit(1);
			return p?.email || null;
		}
		case "dependent": {
			const [d] = await db
				.select({ psrn: dependentsTable.psrn })
				.from(dependentsTable)
				.where(eq(dependentsTable.patientId, patientId))
				.limit(1);
			if (d?.psrn) {
				const [prof] = await db
					.select({ email: professorsTable.email })
					.from(professorsTable)
					.where(eq(professorsTable.psrn, d.psrn))
					.limit(1);
				return prof?.email || null;
			}
			return null;
		}
		case "visitor": {
			const [v] = await db
				.select({ email: visitorsTable.email })
				.from(visitorsTable)
				.where(eq(visitorsTable.patientId, patientId))
				.limit(1);
			return v?.email || null;
		}
		default:
			return null;
	}
}

async function getPatientQueueIdentifier(patientId: number): Promise<{
	identifierType: "student_id" | "psrn" | "phone";
	identifier: string;
} | null> {
	const [patient] = await db
		.select({ id: patientsTable.id, type: patientsTable.type })
		.from(patientsTable)
		.where(eq(patientsTable.id, patientId))
		.limit(1);

	if (!patient) return null;

	switch (patient.type) {
		case "student": {
			const [student] = await db
				.select({ studentId: studentsTable.studentId })
				.from(studentsTable)
				.where(eq(studentsTable.patientId, patientId))
				.limit(1);
			if (!student?.studentId) return null;
			return { identifierType: "student_id", identifier: student.studentId };
		}
		case "professor": {
			const [professor] = await db
				.select({ psrn: professorsTable.psrn })
				.from(professorsTable)
				.where(eq(professorsTable.patientId, patientId))
				.limit(1);
			if (!professor?.psrn) return null;
			return { identifierType: "psrn", identifier: professor.psrn };
		}
		case "dependent": {
			const [dependent] = await db
				.select({ psrn: dependentsTable.psrn })
				.from(dependentsTable)
				.where(eq(dependentsTable.patientId, patientId))
				.limit(1);
			if (!dependent?.psrn) return null;
			return { identifierType: "psrn", identifier: dependent.psrn };
		}
		case "visitor": {
			const [visitor] = await db
				.select({ phone: visitorsTable.phone })
				.from(visitorsTable)
				.where(eq(visitorsTable.patientId, patientId))
				.limit(1);
			if (!visitor?.phone) return null;
			return { identifierType: "phone", identifier: visitor.phone };
		}
		default:
			return null;
	}
}

const booking = createStrictHono()
	.get("/categories", async (c) => {
		const categories = await db
			.select({
				id: doctorSpecialitiesTable.id,
				name: doctorSpecialitiesTable.name,
				description: doctorSpecialitiesTable.description,
			})
			.from(doctorSpecialitiesTable)
			.where(eq(doctorSpecialitiesTable.isActive, true))
			.orderBy(doctorSpecialitiesTable.name);

		return c.json({ success: true, data: categories });
	})

	// List active doctors in a speciality
	.get(
		"/doctors-by-speciality/:specialityId",
		strictValidator(
			"param",
			z.object({ specialityId: z.coerce.number().int().positive() }),
		),
		async (c) => {
			const { specialityId } = c.req.valid("param");

			const doctors = await db
				.select({
					doctorId: doctorsTable.id,
					doctorName: usersTable.name,
					doctorType: doctorsTable.availabilityType,
				})
				.from(doctorsTable)
				.innerJoin(usersTable, eq(doctorsTable.id, usersTable.id))
				.where(eq(doctorsTable.specialityId, specialityId))
				.orderBy(usersTable.name);

			return c.json({ success: true, data: doctors });
		},
	)

	// list appointments with optional filters for reception views
	.get(
		"/appointments",
		strictValidator(
			"query",
			z.object({
				appointmentDate: z.iso.date().optional(),
				doctorId: z.coerce.number().int().positive().optional(),
				patientId: z.coerce.number().int().positive().optional(),
				status: z.enum(appointmentStatusEnum.enumValues).optional(),
				search: z.string().trim().min(1).max(255).optional(),
				limit: z.coerce.number().int().min(1).max(100).default(20),
				offset: z.coerce.number().int().min(0).default(0),
			}),
		),
		async (c) => {
			const query = c.req.valid("query");
			const appointmentDateTime = sql`(${appointmentsTable.appointmentDate} + ${appointmentsTable.slotStart})`;
			const statusFilter = query.status ?? "scheduled";

			const filters = and(
				query.appointmentDate
					? eq(appointmentsTable.appointmentDate, query.appointmentDate)
					: undefined,
				query.doctorId
					? eq(appointmentsTable.doctorId, query.doctorId)
					: undefined,
				query.patientId
					? eq(appointmentsTable.patientId, query.patientId)
					: undefined,
				eq(appointmentsTable.status, statusFilter),
				query.search
					? or(
							ilike(patientsTable.name, `%${query.search}%`),
							ilike(usersTable.name, `%${query.search}%`),
						)
					: undefined,
			);

			const [appointments, [totalRow]] = await Promise.all([
				db
					.select({
						id: appointmentsTable.id,
						patientId: appointmentsTable.patientId,
						patientName: patientsTable.name,
						doctorId: appointmentsTable.doctorId,
						doctorName: usersTable.name,
						appointmentDate: appointmentsTable.appointmentDate,
						slotStart: appointmentsTable.slotStart,
						slotEnd: appointmentsTable.slotEnd,
						status: appointmentsTable.status,
						tokenNumber: appointmentsTable.tokenNumber,
						notes: appointmentsTable.notes,
						bookedById: appointmentsTable.bookedById,
						createdAt: appointmentsTable.createdAt,
						updatedAt: appointmentsTable.updatedAt,
					})
					.from(appointmentsTable)
					.innerJoin(
						patientsTable,
						eq(appointmentsTable.patientId, patientsTable.id),
					)
					.innerJoin(usersTable, eq(appointmentsTable.doctorId, usersTable.id))
					.where(filters)
					.orderBy(
						sql`CASE WHEN ${appointmentDateTime} >= now() THEN 0 ELSE 1 END`,
						sql`CASE WHEN ${appointmentDateTime} >= now() THEN ${appointmentDateTime} END ASC`,
						sql`CASE WHEN ${appointmentDateTime} < now() THEN ${appointmentDateTime} END DESC`,
					)
					.limit(query.limit)
					.offset(query.offset),
				db
					.select({ total: sql<number>`count(*)`.mapWith(Number) })
					.from(appointmentsTable)
					.innerJoin(
						patientsTable,
						eq(appointmentsTable.patientId, patientsTable.id),
					)
					.innerJoin(usersTable, eq(appointmentsTable.doctorId, usersTable.id))
					.where(filters),
			]);

			return c.json({
				success: true,
				data: {
					appointments,
					total: totalRow?.total ?? 0,
					limit: query.limit,
					offset: query.offset,
				},
			});
		},
	)

	// gen available slots for a doctor on a date
	.get(
		"/available-slots",
		strictValidator(
			"query",
			z.object({
				doctorId: z.string(),
				date: z.iso.date(),
			}),
		),
		async (c) => {
			const query = c.req.valid("query");
			const doctorId = Number(query.doctorId);
			const date = query.date;
			const dayOfWeek = daysOfWeek[new Date(date).getDay()];

			const [override] = await db
				.select()
				.from(doctorScheduleOverridesTable)
				.where(
					and(
						eq(doctorScheduleOverridesTable.doctorId, doctorId),
						eq(doctorScheduleOverridesTable.overrideDate, date),
					),
				)
				.limit(1);

			if (override?.overrideType === "unavailable") {
				return c.json({
					success: true,
					data: { slots: [], unavailable: true },
				});
			}

			let timeWindows: {
				startTime: string;
				endTime: string;
				slotDurationMinutes: number;
			}[] = [];

			if (override?.overrideType === "custom_hours") {
				if (
					override.startTime &&
					override.endTime &&
					override.slotDurationMinutes
				) {
					timeWindows = [
						{
							startTime: override.startTime.slice(0, 5),
							endTime: override.endTime.slice(0, 5),
							slotDurationMinutes: override.slotDurationMinutes,
						},
					];
				}
			} else {
				const templates = await db
					.select()
					.from(doctorScheduleTable)
					.where(
						and(
							eq(doctorScheduleTable.doctorId, doctorId),
							eq(doctorScheduleTable.dayOfWeek, dayOfWeek),
						),
					);

				timeWindows = templates.map((t) => ({
					startTime: t.startTime.slice(0, 5),
					endTime: t.endTime.slice(0, 5),
					slotDurationMinutes: t.slotDurationMinutes,
				}));
			}

			if (timeWindows.length === 0) {
				return c.json({
					success: true,
					data: { slots: [], unavailable: true },
				});
			}

			const allSlots = timeWindows.flatMap((w) =>
				generateSlots(w.startTime, w.endTime, w.slotDurationMinutes),
			);

			// get existing booked appointments
			const booked = await db
				.select({ slotStart: appointmentsTable.slotStart })
				.from(appointmentsTable)
				.where(
					and(
						eq(appointmentsTable.doctorId, doctorId),
						eq(appointmentsTable.appointmentDate, date),
						eq(appointmentsTable.status, "scheduled"),
					),
				);

			const bookedSet = new Set(booked.map((b) => b.slotStart.slice(0, 5)));

			const availableSlots = allSlots.filter(
				(s) => !bookedSet.has(s.slotStart),
			);

			return c.json({
				success: true,
				data: { slots: availableSlots, unavailable: false },
			});
		},
	)

	.patch(
		"/appointments/:appointmentId/status",
		rbacCheck({ permissions: ["vitals"] }),
		strictValidator(
			"param",
			z.object({ appointmentId: z.coerce.number().int().positive() }),
		),
		strictValidator(
			"json",
			z.object({
				status: z.enum(appointmentStatusEnum.enumValues),
				cancellationReason: z.string().trim().max(500).optional(),
			}),
		),
		async (c) => {
			const { appointmentId } = c.req.valid("param");
			const { status, cancellationReason } = c.req.valid("json");

			const [updated, queueToken] = await db.transaction(async (tx) => {
				const [appointment] = await tx
					.select({
						id: appointmentsTable.id,
						patientId: appointmentsTable.patientId,
					})
					.from(appointmentsTable)
					.where(eq(appointmentsTable.id, appointmentId))
					.limit(1);

				if (!appointment) {
					return [null, null] as const;
				}

				const [next] = await tx
					.update(appointmentsTable)
					.set({
						status,
						cancelledAt: status === "cancelled" ? new Date() : null,
						cancellationReason:
							status === "cancelled" ? (cancellationReason ?? null) : null,
					})
					.where(eq(appointmentsTable.id, appointmentId))
					.returning({
						id: appointmentsTable.id,
						status: appointmentsTable.status,
						updatedAt: appointmentsTable.updatedAt,
					});

				let nextQueueToken: number | null = null;
				if (status === "completed") {
					const queueIdentifier = await getPatientQueueIdentifier(
						appointment.patientId,
					);

					if (!queueIdentifier) {
						throw new Error("Could not derive patient identifier for queue");
					}

					const [existingQueue] = await tx
						.select({ id: unprocessedTable.id })
						.from(unprocessedTable)
						.where(eq(unprocessedTable.patientId, appointment.patientId))
						.limit(1);

					if (existingQueue) {
						nextQueueToken = existingQueue.id;
					} else {
						const [enqueued] = await tx
							.insert(unprocessedTable)
							.values({
								identifierType: queueIdentifier.identifierType,
								identifier: queueIdentifier.identifier,
								patientId: appointment.patientId,
							})
							.returning({ id: unprocessedTable.id });
						nextQueueToken = enqueued.id;
					}
				}

				return [next, nextQueueToken] as const;
			});

			if (!updated) {
				return c.json(
					{
						success: false,
						error: { message: "Appointment not found" },
					},
					404,
				);
			}

			return c.json({
				success: true,
				data: {
					...updated,
					queueToken,
				},
			});
		},
	)

	.post(
		"/appointments",
		strictValidator(
			"json",
			z.object({
				patientId: z.number().int().positive(),
				doctorId: z.number().int().positive(),
				appointmentDate: z.iso.date(),
				slotStart: z.iso.time(),
				slotEnd: z.iso.time(),
				notes: z.string().optional(),
			}),
		),
		async (c) => {
			const body = c.req.valid("json");
			const bookedById = c.get("jwtPayload").id;

			const result = await db.transaction(async (tx) => {
				const [existing] = await tx
					.select({ id: appointmentsTable.id })
					.from(appointmentsTable)
					.where(
						and(
							eq(appointmentsTable.doctorId, body.doctorId),
							eq(appointmentsTable.appointmentDate, body.appointmentDate),
							eq(appointmentsTable.slotStart, body.slotStart),
							eq(appointmentsTable.status, "scheduled"),
						),
					)
					.limit(1);

				if (existing) {
					return null;
				}

				// calc next token number
				const [{ maxToken }] = await tx
					.select({ maxToken: max(appointmentsTable.tokenNumber) })
					.from(appointmentsTable)
					.where(
						and(
							eq(appointmentsTable.doctorId, body.doctorId),
							eq(appointmentsTable.appointmentDate, body.appointmentDate),
						),
					);

				const tokenNumber = (maxToken ?? 0) + 1;

				const [appointment] = await tx
					.insert(appointmentsTable)
					.values({
						patientId: body.patientId,
						doctorId: body.doctorId,
						appointmentDate: body.appointmentDate,
						slotStart: body.slotStart,
						slotEnd: body.slotEnd,
						bookedById,
						tokenNumber,
						notes: body.notes,
					})
					.returning();

				return { appointment, tokenNumber };
			});

			if (!result) {
				return c.json(
					{
						success: false,
						error: { message: "Slot is already booked" },
					},
					409,
				);
			}
			// Send confirmation email
			const [doctorRecord] = await db
				.select({ name: usersTable.name })
				.from(usersTable)
				.where(eq(usersTable.id, body.doctorId))
				.limit(1);

			sendAppointmentConfirmationEmail(
				body.patientId,
				doctorRecord?.name ?? "Unknown",
				body.appointmentDate,
				body.slotStart,
				result.tokenNumber,
			);

			return c.json({
				success: true,
				data: {
					appointmentId: result.appointment.id,
					tokenNumber: result.tokenNumber,
				},
			});
		},
	);

function sendAppointmentConfirmationEmail(
	patientId: number,
	doctorName: string,
	appointmentDate: string,
	slotStart: string,
	tokenNumber: number,
) {
	getPatientEmail(patientId)
		.then((email) => {
			if (!email) return;

			const formattedDate = new Date(
				`${appointmentDate}T00:00:00`,
			).toLocaleDateString("en-IN", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
			});

			const [hStr, mStr] = slotStart.split(":");
			const h = Number(hStr);
			const m = Number(mStr);
			const period = h >= 12 ? "PM" : "AM";
			const h12 = h % 12 || 12;
			const formattedTime = `${h12}:${String(m).padStart(2, "0")} ${period}`;

			return transporter.sendMail({
				from: env.EMAIL_USER,
				to: email,
				subject: "Appointment Confirmation - Medical Center",
				text: [
					"Your appointment has been confirmed.",
					"",
					`Doctor: Dr. ${doctorName}`,
					`Date: ${formattedDate}`,
					`Time: ${formattedTime}`,
					`Token Number: ${tokenNumber}`,
					"",
					"Please arrive 10 minutes before your scheduled time.",
					"If you need to cancel or reschedule, please contact the medical center reception.",
				].join("\n"),
			});
		})
		.catch((err) => {
			console.error("Failed to send appointment confirmation email:", err);
		});
}

export default booking;
