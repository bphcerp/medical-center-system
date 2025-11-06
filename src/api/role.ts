import { zValidator } from "@hono/zod-validator";
import { eq, getTableColumns } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import { rolesTable } from "@/db/auth";
import { db } from ".";
import { rbacCheck } from "./rbac";

const role = new Hono()
	.get("/all", rbacCheck({ permissions: ["manage-users"] }), async (c) => {
		const { id, name, allowed } = getTableColumns(rolesTable);

		const roles = await db.select({ id, name, allowed }).from(rolesTable);

		return c.json({ roles: roles });
	})
	.post(
		"/:id",
		rbacCheck({ permissions: ["manage-users"] }),
		zValidator("param", z.object({ id: z.coerce.number().int() })),
		zValidator(
			"json",
			z.object({
				allowed: z.array(z.string().min(1)),
			}),
		),
		async (c) => {
			const { id } = c.req.valid("param");
			const { allowed } = c.req.valid("json");

			allowed.sort();

			const res = await db
				.update(rolesTable)
				.set({ allowed: allowed })
				.where(eq(rolesTable.id, id));

			if (res.rowCount !== 1) {
				return c.json({ error: "Role Not Found" }, 404);
			}

			return c.json({ success: true });
		},
	);

export default role;
