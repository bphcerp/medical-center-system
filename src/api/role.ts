import { zValidator } from "@hono/zod-validator";
import { eq, getTableColumns } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import { rolesTable } from "@/db/auth";
import { permissions } from "@/lib/types/permissions";
import { db } from ".";
import { rbacCheck } from "./rbac";

const roleType = z.object({
	name: z.string().min(1),
	allowed: z.enum(permissions).array()
});

const role = new Hono()
	.get("/all", rbacCheck({ permissions: ["admin"] }), async (c) => {
		const { id, name, allowed } = getTableColumns(rolesTable);

		const roles = await db
			.select({ id, name, allowed })
			.from(rolesTable)
			.orderBy(name);

		return c.json({ roles: roles });
	})
	.post(
		"/:id",
		rbacCheck({ permissions: ["admin"] }),
		zValidator("param", z.object({ id: z.coerce.number().int() })),
		zValidator("json", roleType),
		async (c) => {
			const { id } = c.req.valid("param");
			const { name, allowed } = c.req.valid("json");

			allowed.sort();

			const res = await db
				.update(rolesTable)
				.set({ name, allowed })
				.where(eq(rolesTable.id, id));

			if (res.rowCount !== 1) {
				return c.json({ error: "Role Not Found" }, 404);
			}

			return c.json({ success: true });
		},
	)
	.post(
		"/",
		rbacCheck({ permissions: ["admin"] }),
		zValidator("json", roleType),
		async (c) => {
			const { name, allowed } = c.req.valid("json");
			const res = await db.insert(rolesTable).values({ name, allowed });

			if (res.rowCount !== 1) {
				return c.json({ error: "Could not create role" }, 500);
			}

			return c.json({ success: true });
		},
	)
	.delete(
		"/:id",
		rbacCheck({ permissions: ["admin"] }),
		zValidator("param", z.object({ id: z.coerce.number().int() })),
		async (c) => {
			const { id } = c.req.valid("param");

			const res = await db.delete(rolesTable).where(eq(rolesTable.id, id));

			if (res.rowCount !== 1) {
				return c.json({ error: "Role Not Found" }, 404);
			}

			return c.json({ success: true });
		},
	);

export default role;
