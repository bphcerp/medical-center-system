import { zValidator } from "@hono/zod-validator";
import { usersTable } from "@/db/auth";
import "dotenv/config";
import { eq, getTableColumns } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import { db } from ".";
import type { JWTPayload } from "./auth";
import { rbacCheck } from "./rbac";

const user = new Hono()
	.get("/", async (c) => {
		const jwtPayload: JWTPayload = c.get("jwtPayload");
		const { passwordHash: _, ...rest } = getTableColumns(usersTable);
		const users = await db
			.select(rest)
			.from(usersTable)
			.where(eq(usersTable.id, jwtPayload.id))
			.limit(1);
		if (users.length < 1) {
			c.status(404);
			return c.json({
				error: "User Not Found",
			});
		}
		return c.json(users[0]);
	})
	.get("/all", rbacCheck({ permissions: ["manage-users"] }), async (c) => {
		const { id, name, username, role } = getTableColumns(usersTable);

		const users = await db
			.select({ id, name, username, role })
			.from(usersTable);

		return c.json({ users: users });
	})
	// probably will have more to edit than just roles in the future
	.patch(
		"/:id",
		rbacCheck({ permissions: ["manage-users"] }),
		zValidator(
			"param",
			z.object({
				id: z.coerce.number().int(),
			}),
		),
		zValidator(
			"json",
			z.object({
				role: z.number().int(),
			}),
		),
		async (c) => {
			const { id } = c.req.valid("param");
			const { role } = c.req.valid("json");

			const users = await db
				.update(usersTable)
				.set({ role: role })
				.where(eq(usersTable.id, id));

			if (users.rowCount !== 1) {
				c.status(404);
				return c.json({
					error: "User Not Found",
				});
			}

			return c.json({ success: true });
		},
	);

export default user;
