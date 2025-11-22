import { usersTable } from "@/db/auth";
import "dotenv/config";
import { desc, eq, getTableColumns } from "drizzle-orm";
import z from "zod";
import type { JWTPayload } from "@/lib/types/api";
import { createStrictHono, strictValidator } from "@/lib/types/api";
import { db } from ".";
import { rbacCheck } from "./rbac";

const user = createStrictHono()
	.get("/", async (c) => {
		const jwtPayload: JWTPayload = c.get("jwtPayload");
		const { passwordHash: _, ...rest } = getTableColumns(usersTable);
		const users = await db
			.select(rest)
			.from(usersTable)
			.where(eq(usersTable.id, jwtPayload.id))
			.limit(1);
		if (users.length < 1) {
			return c.json(
				{
					success: false,
					error: { message: "User Not Found" },
				},
				404,
			);
		}
		return c.json({
			success: true,
			data: { user: users[0], role: jwtPayload.role },
		});
	})
	.get("/all", rbacCheck({ permissions: ["admin"] }), async (c) => {
		const { id, name, username, role } = getTableColumns(usersTable);

		const users = await db
			.select({ id, name, username, role })
			.from(usersTable)
			.orderBy(desc(role));

		return c.json({ success: true, data: users });
	})
	// probably will have more to edit than just roles in the future
	.post(
		"/:id",
		rbacCheck({ permissions: ["admin"] }),
		strictValidator(
			"param",
			z.object({
				id: z.coerce.number().int().positive(),
			}),
		),
		strictValidator(
			"json",
			z.object({
				role: z.number().int().positive(),
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
				return c.json(
					{
						success: false,
						error: { message: "User Not Found" },
					},
					404,
				);
			}

			return c.json({ success: true, data: { id, role } });
		},
	);

export default user;
