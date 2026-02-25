import "dotenv/config";
import { arrayContains, desc, eq } from "drizzle-orm";
import z from "zod";
import { rolesTable, usersTable } from "@/db/auth";
import {
	doctorCategoryAssignmentsTable,
	doctorTypeEnum,
	specialistCategoriesTable,
} from "@/db/booking";
import { casesTable } from "@/db/case";
import { otpOverrideLogsTable } from "@/db/otp";
import { patientsTable } from "@/db/patient";
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
	.get("/specialist-categories", async (c) => {
		const categories = await db
			.select()
			.from(specialistCategoriesTable)
			.orderBy(specialistCategoriesTable.name);

		return c.json({ success: true, data: categories });
	})
	.post(
		"/specialist-categories",
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
				.insert(specialistCategoriesTable)
				.values({ name, description })
				.returning();

			return c.json({ success: true, data: category });
		},
	)
	.get("/doctors-with-assignments", async (c) => {
		const doctors = await db
			.select({
				id: usersTable.id,
				name: usersTable.name,
				username: usersTable.username,
			})
			.from(usersTable)
			.innerJoin(rolesTable, eq(usersTable.role, rolesTable.id))
			.where(arrayContains(rolesTable.allowed, ["doctor"]))
			.orderBy(usersTable.name);

		const assignments = await db
			.select({
				assignmentId: doctorCategoryAssignmentsTable.id,
				doctorId: doctorCategoryAssignmentsTable.doctorId,
				categoryId: doctorCategoryAssignmentsTable.categoryId,
				doctorType: doctorCategoryAssignmentsTable.doctorType,
				categoryName: specialistCategoriesTable.name,
			})
			.from(doctorCategoryAssignmentsTable)
			.innerJoin(
				specialistCategoriesTable,
				eq(
					doctorCategoryAssignmentsTable.categoryId,
					specialistCategoriesTable.id,
				),
			)
			.where(eq(doctorCategoryAssignmentsTable.isActive, true));

		return c.json({ success: true, data: { doctors, assignments } });
	})
	.post(
		"/doctor-assignments",
		strictValidator(
			"json",
			z.object({
				doctorId: z.number().int().positive(),
				categoryId: z.number().int().positive(),
				doctorType: z.enum(doctorTypeEnum.enumValues),
			}),
		),
		async (c) => {
			const { doctorId, categoryId, doctorType } = c.req.valid("json");

			const [assignment] = await db
				.insert(doctorCategoryAssignmentsTable)
				.values({ doctorId, categoryId, doctorType })
				.returning();

			return c.json({ success: true, data: assignment });
		},
	);

export default admin;
