import "dotenv/config";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { jwt, sign } from "hono/jwt";
import z from "zod";
import env from "@/config/env";
import { usersTable } from "@/db/auth";
import { db } from ".";
import user from "./user";

export type JWTPayload = {
	passwordHash: null;
	id: number;
	username: string;
	email: string;
	name: string;
	phone: string;
	role: number;
};

export const unauthenticated = new Hono()
	.post(
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
				return c.json(
					{
						error: "User Not Found",
					},
					404,
				);
			}

			const isMatch = await Bun.password.verify(
				password,
				users[0].passwordHash,
				"bcrypt",
			);
			if (!isMatch) {
				c.status(400);
				return c.json(
					{
						error: "Incorrect Password",
					},
					400,
				);
			}

			const payload: JWTPayload = {
				...users[0],
				passwordHash: null,
			};
			const jwt = await sign(payload, env.JWT_SECRET);

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
	)
	.post(
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

export const authenticated = new Hono()
	.use(
		jwt({
			cookie: "token",
			secret: env.JWT_SECRET,
		}),
	)
	.route("/user", user);
