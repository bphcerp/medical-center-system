import "dotenv/config";
import { eq, getTableColumns } from "drizzle-orm";
import { Hono } from "hono";
import { usersTable } from "@/db/auth";
import { db } from ".";
import type { JWTPayload } from "./auth";

const user = new Hono().get("/", async (c) => {
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
});

export default user;
