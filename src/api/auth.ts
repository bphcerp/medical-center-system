import "dotenv/config";
import { eq, or, sql } from "drizzle-orm";
import { google } from "googleapis";
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
	type LoginError,
	type StrictHandler,
	strictJwt,
	strictValidator,
} from "@/lib/types/api";
import type { Permission } from "@/lib/types/permissions";
import { db } from ".";
import admin from "./admin";
import booking from "./booking";
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

const authCookieDomain = env.FRONTEND_URL.replace("https://", "")
	.replace("http://", "")
	.split(":")[0];

const googleOAuthClient = new google.auth.OAuth2({
	clientId: env.GOOGLE_CLIENT_ID,
	clientSecret: env.GOOGLE_CLIENT_SECRET,
	redirectUri: env.GOOGLE_REDIRECT_URI,
});

type OAuthStateRecord = {
	nonce: string;
	expiresAt: number;
};

const oauthStateStore = new Map<string, OAuthStateRecord>();

const cleanupExpiredOAuthStates = () => {
	const now = Date.now();
	for (const [state, record] of oauthStateStore.entries()) {
		if (record.expiresAt <= now) {
			oauthStateStore.delete(state);
		}
	}
};

const putOAuthState = (state: string, nonce: string) => {
	cleanupExpiredOAuthStates();
	oauthStateStore.set(state, {
		nonce,
		expiresAt: Date.now() + env.OAUTH_STATE_TTL_SECONDS * 1000,
	});
};

const consumeOAuthState = (state: string) => {
	const record = oauthStateStore.get(state);
	if (!record) {
		return null;
	}
	oauthStateStore.delete(state);
	if (record.expiresAt <= Date.now()) {
		return null;
	}
	return record;
};

const asTypedRole = (role: { id: number; name: string; allowed: string[] }) => {
	return {
		...role,
		allowed: role.allowed as Permission[],
	};
};

const clearAuthCookies = (c: Context) => {
	deleteCookie(c, "token", {
		path: "/",
		httpOnly: false,
		domain: authCookieDomain,
		secure: env.PROD,
	});
	deleteCookie(c, "fingerprint", {
		path: "/",
		httpOnly: true,
		domain: authCookieDomain,
		secure: env.PROD,
	});
};

const redirectToLoginWithError = (c: Context, error: LoginError) => {
	const query = new URLSearchParams({ error: error });
	return c.redirect(`/login?${query.toString()}`);
};

const issueAuthSession = async (
	c: Context,
	userRecord: typeof usersTable.$inferSelect,
	roleRecord: { id: number; name: string; allowed: Permission[] },
) => {
	const fingerprint = crypto.randomUUID();

	const payload: JWTPayload = {
		...userRecord,
		passwordHash: null,
		role: roleRecord,
		fingerprintHash: Bun.SHA256.hash(fingerprint, "base64url"),
	};

	const jwt = await sign(payload, env.JWT_SECRET);

	setCookie(c as Context, "token", jwt, {
		path: "/",
		httpOnly: false,
		domain: authCookieDomain,
		secure: env.PROD,
	});

	setCookie(c as Context, "fingerprint", fingerprint, {
		path: "/",
		httpOnly: true,
		domain: authCookieDomain,
		secure: env.PROD,
	});

	return { token: jwt, fingerprint };
};

export const unauthenticated = createStrictHono()
	.get("/oauth/google/start", async (c) => {
		if (
			env.GOOGLE_CLIENT_ID.length === 0 ||
			env.GOOGLE_CLIENT_SECRET.length === 0 ||
			env.GOOGLE_REDIRECT_URI.length === 0
		) {
			return redirectToLoginWithError(c, "oauth_not_configured");
		}

		const state = crypto.randomUUID();
		const nonce = crypto.randomUUID();
		putOAuthState(state, nonce);

		const authUrl = googleOAuthClient.generateAuthUrl({
			access_type: "online",
			scope: ["openid", "email", "profile"],
			state,
			nonce,
		});

		return c.redirect(authUrl);
	})
	.get("/oauth/google/callback", async (c) => {
		const oauthError = c.req.query("error");
		if (oauthError) {
			return redirectToLoginWithError(c, "google_oauth_error");
		}

		const code = c.req.query("code");
		const state = c.req.query("state");

		if (!code || !state) {
			return redirectToLoginWithError(c, "missing_code_or_state");
		}

		const oauthState = consumeOAuthState(state);
		if (!oauthState) {
			return redirectToLoginWithError(c, "state_invalid");
		}

		let idToken: string | null | undefined;
		try {
			const tokenResult = await googleOAuthClient.getToken(code);
			idToken = tokenResult.tokens.id_token;
		} catch {
			return redirectToLoginWithError(c, "token_exchange_failed");
		}

		if (!idToken) {
			return redirectToLoginWithError(c, "token_invalid");
		}

		let verifiedPayload:
			| {
					sub: string;
					email?: string;
					email_verified?: boolean;
					iss: string;
					nonce?: string;
			  }
			| undefined;

		try {
			const ticket = await googleOAuthClient.verifyIdToken({
				idToken,
				audience: env.GOOGLE_CLIENT_ID,
			});
			verifiedPayload = ticket.getPayload();
		} catch {
			return redirectToLoginWithError(c, "id_token_verification_failed");
		}

		if (!verifiedPayload) {
			return redirectToLoginWithError(c, "token_invalid");
		}

		const tokenIssuer = verifiedPayload.iss;
		if (
			tokenIssuer !== "https://accounts.google.com" &&
			tokenIssuer !== "accounts.google.com"
		) {
			return redirectToLoginWithError(c, "issuer_invalid");
		}

		const {
			sub,
			email,
			email_verified: emailVerified,
			nonce,
		} = verifiedPayload;

		if (
			typeof sub !== "string" ||
			typeof email !== "string" ||
			emailVerified !== true ||
			typeof nonce !== "string"
		) {
			return redirectToLoginWithError(c, "google_claims_invalid");
		}

		if (nonce !== oauthState.nonce) {
			return redirectToLoginWithError(c, "nonce_mismatch");
		}

		// First check if google sub matches, if so then we have our user and can skip the email lookup.
		// If we find a user with the email but they dont have a google sub, we can update their record
		// to link it to the google account.

		const usersByGoogleSub = await db
			.select({ user: usersTable, roles: rolesTable })
			.from(usersTable)
			.innerJoin(rolesTable, eq(rolesTable.id, usersTable.role))
			.where(eq(usersTable.googleSub, sub))
			.limit(1);

		if (usersByGoogleSub.length > 0) {
			const { user, roles } = usersByGoogleSub[0];
			await issueAuthSession(c, user, asTypedRole(roles));
			return c.redirect("/");
		}

		const usersByEmail = await db
			.select({ user: usersTable, roles: rolesTable })
			.from(usersTable)
			.innerJoin(rolesTable, eq(rolesTable.id, usersTable.role))
			.where(sql`lower(${usersTable.email}) = ${email.toLowerCase()}`)
			.limit(1);

		if (usersByEmail.length < 1) {
			return redirectToLoginWithError(c, "email_not_found");
		}

		const { user, roles } = usersByEmail[0];

		if (user.googleSub === null) {
			await db
				.update(usersTable)
				.set({ googleSub: sub })
				.where(eq(usersTable.id, user.id));
			user.googleSub = sub;
		} else if (user.googleSub !== sub) {
			return redirectToLoginWithError(c, "google_sub_mismatch");
		}

		await issueAuthSession(c, user, asTypedRole(roles));
		return c.redirect("/");
	})
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
				.where(
					or(
						eq(usersTable.username, username),
						sql`lower(${usersTable.email}) = ${username.toLowerCase()}`,
					),
				)
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
			const session = await issueAuthSession(
				c,
				user,
				asTypedRole(users[0].roles),
			);
			return c.json({
				success: true,
				data: session,
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
				name: z.string().min(1),
				username: z.string().min(1),
				password: z.string().min(1),
				email: z.email(),
			}),
		),
		async (c) => {
			const { username, password, email, name } = c.req.valid("json");
			const hash = await Bun.password.hash(password, "bcrypt");
			const [user] = await db
				.insert(usersTable)
				.values({
					email: email,
					name: name,
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
						.where(
							sql`lower(${studentsTable.studentId}) = ${identifier.toLowerCase()}`,
						)
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
						.where(
							sql`lower(${professorsTable.psrn}) = ${identifier.toLowerCase()}`,
						)
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
						.where(
							sql`lower(${dependentsTable.psrn}) = ${identifier.toLowerCase()}`,
						)
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
	.route("/admin", admin)
	.route("/booking", booking);
