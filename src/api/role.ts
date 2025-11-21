import { eq, getTableColumns } from "drizzle-orm";
import z from "zod";
import { rolesTable } from "@/db/auth";
import { createStrictHono, strictValidator } from "@/lib/types/api";
import { permissions } from "@/lib/types/permissions";
import { db } from ".";
import { rbacCheck } from "./rbac";

const roleType = z.object({
	name: z.string().min(1),
	allowed: z.enum(permissions).array(),
});

const role = createStrictHono()
	.use(rbacCheck({ permissions: ["admin"] }))
	.get("/all", async (c) => {
		const { id, name, allowed } = getTableColumns(rolesTable);

		const roles = await db
			.select({ id, name, allowed })
			.from(rolesTable)
			.orderBy(name);

		return c.json({ success: true, data: roles });
	})
	.post(
		"/:id",
		strictValidator("param", z.object({ id: z.coerce.number().int() })),
		strictValidator("json", roleType),
		async (c) => {
			const { id } = c.req.valid("param");
			const { name, allowed } = c.req.valid("json");

			allowed.sort();

			const res = await db
				.update(rolesTable)
				.set({ name, allowed })
				.where(eq(rolesTable.id, id));

			if (res.rowCount !== 1) {
				return c.json(
					{
						success: false,
						error: {
							message: "Role Not Found",
							details: { id },
						},
					},
					404,
				);
			}

			return c.json({ success: true, data: { id, name, allowed } });
		},
	)
	.post("/", strictValidator("json", roleType), async (c) => {
		const { name, allowed } = c.req.valid("json");
		const res = await db.insert(rolesTable).values({ name, allowed });
		if (res.rowCount !== 1) {
			return c.json(
				{
					success: false,
					error: {
						message: "Could not create role",
						details: res,
					},
				},
				400,
			);
		}

		return c.json({ success: true, data: { name, allowed } });
	})
	.delete(
		"/:id",
		strictValidator("param", z.object({ id: z.coerce.number().int() })),
		async (c) => {
			const { id } = c.req.valid("param");

			const res = await db.delete(rolesTable).where(eq(rolesTable.id, id));
			if (res.rowCount !== 1) {
				return c.json(
					{
						success: false,
						error: {
							message: "Could not delete role",
							details: res,
						},
					},
					400,
				);
			}

			return c.json({ success: true, data: { id } });
		},
	);

export default role;
