import "dotenv/config";
import { zValidator } from "@hono/zod-validator";
import { arrayContains, eq, getTableColumns } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import { rolesTable, usersTable } from "@/db/auth";
import { casesTable, unprocessedTable } from "@/db/case";
import { patientsTable } from "@/db/patient";
import { getAge } from "@/lib/utils";
import { db } from ".";
import { rbacCheck } from "./rbac";

const vitals = new Hono()
	.use(rbacCheck({ permissions: ["vitals"] }))
	.get("/unprocessed", async (c) => {
		const unprocessed = await db
			.select()
			.from(unprocessedTable)
			.innerJoin(
				patientsTable,
				eq(unprocessedTable.patientId, patientsTable.id),
			)
			.orderBy(unprocessedTable.id);

		return c.json({
			unprocessed: unprocessed.map((item) => ({
				...item,
				patients: {
					...item.patients,
					age: getAge(item.patients.birthdate),
				},
			})),
		});
	})
	.get("/availableDoctors", async (c) => {
		const { passwordHash: _, ...rest } = getTableColumns(usersTable);
		const doctors = await db
			.select(rest)
			.from(usersTable)
			.innerJoin(rolesTable, eq(usersTable.role, rolesTable.id))
			.where(arrayContains(rolesTable.allowed, ["doctor"]));

		return c.json({ doctors });
	})
	.post(
		"/createCase",
		zValidator(
			"json",
			z.object({
				patientId: z.number().int().min(1),
				token: z.number().int().min(1),
				doctorId: z.number().int().min(1),
				vitals: z.object({
					bodyTemperature: z.number().nullable(),
					heartRate: z.number().nullable(),
					respiratoryRate: z.number().nullable(),
					bloodPressureSystolic: z.number().nullable(),
					bloodPressureDiastolic: z.number().nullable(),
					spo2: z.number().nullable(),
					bloodSugar: z.number().nullable(),
					weight: z.number().nullable(),
				}),
			}),
		),
		async (c) => {
			const { patientId, token, doctorId, vitals } = c.req.valid("json");

			const result = await db.transaction(async (tx) => {
				const result = await tx
					.insert(casesTable)
					.values({
						token,
						patient: patientId,

						weight: vitals.weight,
						temperature: vitals.bodyTemperature,
						heartRate: vitals.heartRate,
						respiratoryRate: vitals.respiratoryRate,
						bloodPressureSystolic: vitals.bloodPressureSystolic,
						bloodPressureDiastolic: vitals.bloodPressureDiastolic,
						bloodSugar: vitals.bloodSugar,
						spo2: vitals.spo2,

						associatedUsers: [doctorId],
					})
					.returning();

				await tx.delete(unprocessedTable).where(eq(unprocessedTable.id, token));
				return result[0];
			});

			return c.json(
				{ message: "Case created successfully", case: result },
				201,
			);
		},
	);

export default vitals;
