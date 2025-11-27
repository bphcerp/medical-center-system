import "dotenv/config";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
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
import {
	createStrictHono,
	type JWTPayload,
	type StrictHandler,
	strictJwt,
	strictValidator,
} from "@/lib/types/api";
import type { Permission } from "@/lib/types/permissions";
import { db } from ".";
import admin from "./admin";
import doctor from "./doctor";
import files from "./files";
import inventory from "./inventory";
import lab from "./lab";
import patientHistory from "./patientHistory";
import role from "./role";
import user from "./user";
import vitals from "./vitals";

export interface CookieValues {
	token: string | undefined;
}

const clearAuthCookies = (c: Context) => {
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
};

export const unauthenticated = createStrictHono()
	.post(
		"/login",
		strictValidator(
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
						success: false,
						error: {
							message: "User Not Found",
							details: { username },
						},
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
				return c.json(
					{
						success: false,
						error: {
							message: "Incorrect Password",
							details: { password },
						},
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

			setCookie(c as Context, "token", jwt, {
				path: "/",
				httpOnly: false,
				domain: env.FRONTEND_URL.replace("https://", "")
					.replace("http://", "")
					.split(":")[0],
			});
			setCookie(c as Context, "fingerprint", fingerprint, {
				path: "/",
				httpOnly: true,
				domain: env.FRONTEND_URL.replace("https://", "")
					.replace("http://", "")
					.split(":")[0],
			});
			return c.json({
				success: true,
				data: {
					token: jwt,
					fingerprint: fingerprint,
				},
			});
		},
	)
	.get("/logout", async (c) => {
		clearAuthCookies(c as Context);
		return c.redirect("/login");
	})
	.post(
		"/signup",
		strictValidator(
			"json",
			z.object({
				username: z.string().min(1),
				password: z.string().min(1),
			}),
		),
		async (c) => {
			const { username, password } = c.req.valid("json");
			const hash = await Bun.password.hash(password, "bcrypt");
			const [user] = await db
				.insert(usersTable)
				.values({
					email: "",
					name: "",
					passwordHash: hash,
					phone: "",
					role: 1,
					username: username,
				})
				.returning();
			return c.json({
				success: true,
				data: user,
			});
		},
	)
	.get(
		"/existing",
		strictValidator(
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
						return c.json({
							success: true,
							data: { exists: false, tryVisitorRegistration: true },
						});
					}
					return c.json({
						success: true,
						data: {
							...student[0].patients,
							email: student[0].students.email,
							exists: true,
						},
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
						return c.json({
							success: true,
							data: { exists: false, tryVisitorRegistration: false },
						});
					}
					return c.json({
						success: true,
						data: {
							...visitor[0].patients,
							email: visitor[0].visitors.email,
							exists: true,
						},
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
						return c.json({
							success: true,
							data: { exists: false, tryVisitorRegistration: true },
						});
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
						success: true,
						data: {
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
						},
					});
				}
			}
		},
	)
	.post(
		"/visitorRegister",
		strictValidator(
			"json",
			z.object({
				name: z.string().min(1),
				birthdate: z.iso.date(),
				sex: z.enum(["male", "female"]),
				phone: z.string().min(1),
				email: z.email(),
			}),
		),
		async (c) => {
			const { name, birthdate, sex, phone, email } = c.req.valid("json");
			const birthdateObj = new Date(birthdate);
			if (birthdateObj > new Date()) {
				return c.json(
					{
						success: false,
						error: { message: "Birthdate cannot be in the future" },
					},
					400,
				);
			}
			const token = await db.transaction(async (tx) => {
				const patient = await tx
					.insert(patientsTable)
					.values({
						name,
						type: "visitor",
						birthdate: birthdate.split("T")[0],
						sex,
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
				data: {
					token: token[0].id,
				},
			});
		},
	)
	.post(
		"/register",
		strictValidator(
			"json",
			z.object({
				identifierType: z.enum(identifierTypes),
				identifier: z.string().min(1),
				patientId: z.number().int().positive(),
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
				data: {
					token: token[0].id,
				},
			});
		},
	);

const authMiddleware: StrictHandler = async (c, next) => {
	const jwt = c.get("jwtPayload");
	const fingerprint = getCookie(c as Context, "fingerprint") || "";
	const fingerprintHash = Bun.SHA256.hash(fingerprint, "base64url");
	if (jwt.fingerprintHash !== fingerprintHash) {
		clearAuthCookies(c as Context);
		return c.redirect("/login");
	}
	await next();
};

export const authenticated = createStrictHono()
	.use(
		strictJwt({
			cookie: "token",
			secret: env.JWT_SECRET,
		}),
	)
	.use(authMiddleware)
	.route("/role", role)
	.route("/user", user)
	.route("/vitals", vitals)
	.route("/doctor", doctor)
	.route("/lab", lab)
	.route("/files", files)
	.route("/inventory", inventory)
	.route("/patientHistory", patientHistory)
	.route("/admin", admin);
