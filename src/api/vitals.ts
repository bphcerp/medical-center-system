import "dotenv/config";
import { arrayContains, eq, getTableColumns } from "drizzle-orm";
import z from "zod";
import { rolesTable, usersTable } from "@/db/auth";
import { casesTable, unprocessedTable } from "@/db/case";
import { patientsTable } from "@/db/patient";
import { createStrictHono, strictValidator } from "@/lib/types/api";
import { getAge } from "@/lib/utils";
import { db } from ".";
import { rbacCheck } from "./rbac";

const vitals = createStrictHono()
	.use(rbacCheck({ permissions: ["vitals"] }))
	.get("/unprocessed", async (c) => {
		const unprocessed = await db
			.select({
				name: patientsTable.name,
				birthdate: patientsTable.birthdate,
				sex: patientsTable.sex,
				token: unprocessedTable.id,
				id: patientsTable.id,
				type: patientsTable.type,
				identifierType: unprocessedTable.identifierType,
			})
			.from(unprocessedTable)
			.innerJoin(
				patientsTable,
				eq(unprocessedTable.patientId, patientsTable.id),
			)
			.orderBy(unprocessedTable.id);

		return c.json({
			success: true,
			data: unprocessed.map((item) => ({
				...item,
				patients: {
					...item,
					age: getAge(item.birthdate),
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

		return c.json({ success: true, data: doctors });
	})
	.post(
		"/createCase",
		strictValidator(
			"json",
			z.object({
				patientId: z.number().int().positive(),
				token: z.number().int().positive(),
				doctorId: z.number().int().positive(),
				vitals: z.object({
					bodyTemperature: z.number().positive().nullable(),
					heartRate: z.number().positive().nullable(),
					respiratoryRate: z.number().positive().nullable(),
					bloodPressureSystolic: z.number().positive().nullable(),
					bloodPressureDiastolic: z.number().positive().nullable(),
					spo2: z.number().positive().nullable(),
					bloodSugar: z.number().positive().nullable(),
					weight: z.number().positive().nullable(),
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
				{
					success: true,
					data: result,
				},
				201,
			);
		},
	);

export default vitals;
