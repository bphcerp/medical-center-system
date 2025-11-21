import "dotenv/config";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { jwt, sign } from "hono/jwt";
import z from "zod";
import { rolesTable, usersTable } from "@/db/auth";
import { identifierTypes, unprocessedTable } from "@/db/case";
import {
	dependentsTable,
	patientsTable,
	professorsTable,
	studentsTable,
	visitorsTable,
} from "@/db/patient";
import env from "@/lib/env";
import type { Permission } from "@/lib/types/permissions";
import { db } from ".";
import admin from "./admin";
import doctor from "./doctor";
import files from "./files";
import inventory from "./inventory";
import lab from "./lab";
import patientHistory from "./patientHistory";
import rbac from "./rbac";
import role from "./role";
import user from "./user";
import vitals from "./vitals";

export type JWTPayload = {
	passwordHash: null;
	role: {
		id: number;
		name: string;
		allowed: Permission[];
	};
	id: number;
	username: string;
	email: string;
	name: string;
	phone: string;
	fingerprintHash: string;
};

export interface CookieValues {
	token: string | undefined;
}

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
				.innerJoin(rolesTable, eq(rolesTable.id, usersTable.role))
				.limit(1);
			if (users.length < 1) {
				return c.json(
					{
						error: "User Not Found",
					},
					404,
				);
			}

			const user = users[0].users;

			const isMatch = await Bun.password.verify(
				password,
				user.passwordHash,
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
			const fingerprint = Math.random().toString(36).substring(2);

			const payload: JWTPayload = {
				...user,
				passwordHash: null,
				role: users[0].roles as {
					id: number;
					name: string;
					allowed: Permission[];
				},
				fingerprintHash: Bun.SHA256.hash(fingerprint, "base64url"),
			};
			const jwt = await sign(payload, env.JWT_SECRET);

			setCookie(c, "token", jwt, {
				path: "/",
				httpOnly: false,
				domain: env.FRONTEND_URL.replace("https://", "")
					.replace("http://", "")
					.split(":")[0],
			});
			setCookie(c, "fingerprint", fingerprint, {
				path: "/",
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
	.get("/logout", async (c) => {
		deleteCookie(c, "token", {
			path: "/",
			httpOnly: false,
			domain: env.FRONTEND_URL.replace("https://", "")
				.replace("http://", "")
				.split(":")[0],
		});
		deleteCookie(c, "fingerprint", {
			path: "/",
			httpOnly: true,
			domain: env.FRONTEND_URL.replace("https://", "")
				.replace("http://", "")
				.split(":")[0],
		});
		return c.redirect("/login");
	})
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
	)
	.get(
		"/existing",
		zValidator(
			"query",
			z.object({
				identifierType: z.enum(identifierTypes),
				identifier: z.string().min(1),
			}),
		),
		async (c) => {
			const identifier = c.req.valid("query").identifier;
			switch (c.req.valid("query").identifierType) {
				case "student_id": {
					const student = await db
						.select()
						.from(studentsTable)
						.where(eq(studentsTable.studentId, identifier))
						.innerJoin(
							patientsTable,
							eq(studentsTable.patientId, patientsTable.id),
						)
						.limit(1);
					if (student.length < 1) {
						return c.json({ exists: false }, 400);
					}
					return c.json({
						...student[0].patients,
						email: student[0].students.email,
						exists: true,
					});
				}
				case "phone": {
					const visitor = await db
						.select()
						.from(visitorsTable)
						.where(eq(visitorsTable.phone, identifier))
						.innerJoin(
							patientsTable,
							eq(visitorsTable.patientId, patientsTable.id),
						)
						.limit(1);
					if (visitor.length < 1) {
						return c.json({ exists: false }, 404);
					}
					return c.json({
						...visitor[0].patients,
						email: visitor[0].visitors.email,
						exists: true,
					});
				}
				case "psrn": {
					const professor = await db
						.select()
						.from(professorsTable)
						.where(eq(professorsTable.psrn, identifier))
						.innerJoin(
							patientsTable,
							eq(professorsTable.patientId, patientsTable.id),
						)
						.limit(1);
					if (professor.length < 1) {
						return c.json({ exists: false }, 400);
					}
					const dependents = await db
						.select()
						.from(dependentsTable)
						.where(eq(dependentsTable.psrn, identifier))
						.innerJoin(
							patientsTable,
							eq(dependentsTable.patientId, patientsTable.id),
						);
					return c.json({
						professor: {
							...professor[0].patients,
						},
						email: professor[0].professors.email,
						dependents: dependents.map((d) => {
							return {
								...d.patients,
							};
						}),
						exists: true,
					});
				}
			}
		},
	)
	.post(
		"/visitorRegister",
		zValidator(
			"json",
			z.object({
				name: z.string().min(1),
				age: z.number().int().min(0),
				sex: z.enum(["male", "female"]),
				phone: z.string().min(1),
				email: z.email(),
			}),
		),
		async (c) => {
			const { name, age, sex, phone, email } = c.req.valid("json");
			const token = await db.transaction(async (tx) => {
				const patient = await tx
					.insert(patientsTable)
					.values({
						name,
						age,
						sex,
						type: "visitor",
					})
					.returning();
				await tx.insert(visitorsTable).values({
					email,
					phone,
					patientId: patient[0].id,
				});
				return await tx
					.insert(unprocessedTable)
					.values({
						identifier: phone,
						identifierType: "phone",
						patientId: patient[0].id,
					})
					.returning();
			});

			return c.json({
				success: true,
				token: token[0].id,
			});
		},
	)
	.post(
		"/register",
		zValidator(
			"json",
			z.object({
				identifierType: z.enum(identifierTypes),
				identifier: z.string().min(1),
				patientId: z.number().int(),
			}),
		),
		async (c) => {
			const { identifierType, identifier, patientId } = c.req.valid("json");
			const token = await db
				.insert(unprocessedTable)
				.values({
					identifier,
					identifierType,
					patientId,
				})
				.returning();
			return c.json({
				success: true,
				token: token[0].id,
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
	.use(async (c, next) => {
		const jwt: JWTPayload = c.get("jwtPayload");
		const fingerprint = getCookie(c, "fingerprint") || "";
		const fingerprintHash = Bun.SHA256.hash(fingerprint, "base64url");
		if (jwt.fingerprintHash !== fingerprintHash) {
			return c.json(
				{
					error: "Invalid Fingerprint",
				},
				401,
			);
		}
		await next();
	})
	.route("/role", role)
	.route("/user", user)
	.route("/rbac", rbac)
	.route("/vitals", vitals)
	.route("/doctor", doctor)
	.route("/lab", lab)
	.route("/files", files)
	.route("/inventory", inventory)
	.route("/patientHistory", patientHistory)
	.route("/admin", admin);
