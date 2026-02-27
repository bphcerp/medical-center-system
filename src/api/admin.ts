import "dotenv/config";
import { and, arrayContains, desc, eq, isNull } from "drizzle-orm";
import z from "zod";
import { rolesTable, usersTable } from "@/db/auth";
import { casesTable } from "@/db/case";
import {
	doctorAvailabilityTypeEnum,
	doctorScheduleTable,
	doctorSpecialitiesTable,
	doctorsTable,
} from "@/db/doctor";
import { otpOverrideLogsTable } from "@/db/otp";
import { patientsTable } from "@/db/patient";
import { dayOfWeekEnum } from "@/db/utils";
import { createStrictHono, strictValidator } from "@/lib/types/api";
import { db } from ".";
import { rbacCheck } from "./rbac";

const admin = createStrictHono()
	.use(rbacCheck({ permissions: ["admin"] }))
	.get("/otp-override-logs", async (c) => {
		const logs = await db
			.select({
				id: otpOverrideLogsTable.id,
				doctorId: otpOverrideLogsTable.doctorId,
				doctorName: usersTable.name,
				doctorUsername: usersTable.username,
				caseId: otpOverrideLogsTable.caseId,
				patientId: patientsTable.id,
				patientName: patientsTable.name,
				reason: otpOverrideLogsTable.reason,
				createdAt: otpOverrideLogsTable.createdAt,
			})
			.from(otpOverrideLogsTable)
			.innerJoin(usersTable, eq(usersTable.id, otpOverrideLogsTable.doctorId))
			.innerJoin(casesTable, eq(casesTable.id, otpOverrideLogsTable.caseId))
			.innerJoin(patientsTable, eq(patientsTable.id, casesTable.patient))
			.orderBy(desc(otpOverrideLogsTable.createdAt));

		return c.json({ success: true, data: logs });
	})
	.get("/specialization/all", async (c) => {
		const categories = await db
			.select()
			.from(doctorSpecialitiesTable)
			.orderBy(doctorSpecialitiesTable.name);

		return c.json({ success: true, data: categories });
	})
	.post(
		"/specialization",
		strictValidator(
			"json",
			z.object({
				name: z.string().min(1).max(255),
				description: z.string().min(1).optional(),
			}),
		),
		async (c) => {
			const { name, description } = c.req.valid("json");

			const [category] = await db
				.insert(doctorSpecialitiesTable)
				.values({ name, description })
				.returning();

			return c.json({ success: true, data: category });
		},
	)
	.get("/doctor/all", async (c) => {
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
	.get("/doctor/unassigned", async (c) => {
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
		"/doctor/:doctorId",
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

			const [assignment] = await db
				.insert(doctorsTable)
				.values({ id, specialityId, availabilityType })
				.onConflictDoUpdate({
					target: doctorsTable.id,
					set: { specialityId, availabilityType },
				})
				.returning();

			return c.json({ success: true, data: assignment });
		},
	)
	.get(
		"/doctor/:doctorId/schedule",
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
		"/doctor/:doctorId/schedule",
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
	);

const getPermissionsForUser = async (userId: number): Promise<string[]> => {
	const result = await db
		.select({ allowed: rolesTable.allowed })
		.from(usersTable)
		.innerJoin(rolesTable, eq(usersTable.role, rolesTable.id))
		.where(eq(usersTable.id, userId))
		.limit(1);

	return result[0]?.allowed ?? [];
};

const isDoctor = async (id: number) => {
	const perms = await getPermissionsForUser(id);
	return perms.includes("doctor");
};

export default admin;
