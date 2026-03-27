import { doctorSpecialitiesTable } from "src/db/doctor";
import { createStrictHono, strictValidator } from "src/lib/types/api";
import { z } from "zod";
import { db } from ".";
import { rbacCheck } from "./rbac";

// Route prefix: /api/doctor/speciality
const speciality = createStrictHono()
	.get("/all", async (c) => {
		const categories = await db
			.select()
			.from(doctorSpecialitiesTable)
			.orderBy(doctorSpecialitiesTable.name);

		return c.json({ success: true, data: categories });
	})
	.post(
		"/",
		rbacCheck({ permissions: ["admin"] }),
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
	);

export default speciality;
