import "dotenv/config";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import z from "zod";
import env from "@/config/env";
import { usersTable } from "@/db/auth";
import { db } from ".";

const unauthenticated = new Hono();

unauthenticated.post(
	"/login",
	zValidator(
		"json",
		z.object({
			username: z.string().min(1),
			password: z.string().min(1),
		}),
	),
	async (c) => {
		const { username, password } = c.req.valid("json");
		const users = await db
			.select()
			.from(usersTable)
			.where(eq(usersTable.username, username))
			.limit(1);
		if (users.length < 1) {
			c.status(404);
			return c.json({
				error: "User Not Found",
			});
		}

		const isMatch = await Bun.password.verify(
			password,
			users[0].passwordHash,
			"bcrypt",
		);
		if (!isMatch) {
			c.status(400);
			return c.json({
				error: "Incorrect Password",
			});
		}

		const jwt = await sign(
			{
				...users[0],
				passwordHash: null,
			},
			env.JWT_SECRET,
		);

		setCookie(c, "token", jwt, {
			path: "/",
			secure: true,
			httpOnly: true,
			domain: env.FRONTEND_URL.replace("https://", "")
				.replace("http://", "")
				.split(":")[0],
		});
		return c.json({
			success: true,
		});
	},
);

unauthenticated.post(
	"/signup",
	zValidator(
		"json",
		z.object({
			username: z.string().min(1),
			password: z.string().min(1),
		}),
	),
	async (c) => {
		const { username, password } = c.req.valid("json");
		const hash = await Bun.password.hash(password, "bcrypt");
		await db.insert(usersTable).values({
			email: "",
			name: "",
			passwordHash: hash,
			phone: "",
			role: 1,
			username: username,
		});
		return c.json({
			success: true,
		});
	},
);

export default unauthenticated;
