import "dotenv/config";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { casesTable } from "@/db/case";
import { patientsTable } from "@/db/patient";
import { db } from ".";
// import type { JWTPayload } from "./auth"; // might need this later
import { rbacCheck } from "./rbac";

const patientHistory = new Hono()
	.use(rbacCheck({ permissions: ["doctor"] }))
	.get("/:patientId", async (c) => {
		const patientId = Number(c.req.param("patientId"));

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
	});

export default patientHistory;
