import "dotenv/config";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import type { IncomingHttpHeaders } from "node:http";
import { request as httpRequest } from "node:http";
import { drizzle } from "drizzle-orm/node-postgres";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { dbAccessAuditLogsTable } from "@/db/dbAccess";
import env from "@/lib/env";
import {
	createStrictHono,
	type StrictContext,
	type StrictHandler,
	strictValidator,
} from "@/lib/types/api";
import { validateAllTotpCodes } from "@/utils/totp";

const HEARTBEAT_INTERVAL_SECONDS = 3;
const DB_ACCESS_COOKIE_NAME = "db_access_session";
const DB_ACCESS_COOKIE_PATH = "/api/dbAccess";
const FRONTEND_ORIGIN = new URL(env.FRONTEND_URL).origin;
const AUTH_COOKIE_DOMAIN = env.FRONTEND_URL.replace("https://", "")
	.replace("http://", "")
	.split(":")[0];
const db = drizzle({
	connection: {
		connectionString: env.DATABASE_URL,
	},
});

type DbAccessAuditAction =
	| "session_opened"
	| "session_open_denied_active"
	| "session_open_failed_totp"
	| "session_open_failed_rate_limited"
	| "session_open_failed_config"
	| "session_closed_explicit"
	| "session_closed_inactivity"
	| "session_closed_max_duration"
	| "session_closed_startup"
	| "session_close_failed";

type ActiveViewer = {
	lastSeenAt: number;
};

type ActiveDbAccessSession = {
	sessionId: string;
	initiatorUserId: number;
	initiatorEmail: string;
	initiatorName: string;
	reason: string;
	startedAt: number;
	lastHeartbeatAt: number;
	hardExpiresAt: number;
	viewerTokenHash: string;
	viewers: Map<string, ActiveViewer>;
};

type FailedAttemptStore = Map<number, number[]>;

type DbAccessStore = {
	activeSession: ActiveDbAccessSession | null;
	failedAttempts: FailedAttemptStore;
	cleanupIntervalStarted: boolean;
	startupCleanupTriggered: boolean;
};

declare global {
	var __medicalCenterDbAccessStore: DbAccessStore | undefined;
}

if (!globalThis.__medicalCenterDbAccessStore) {
	globalThis.__medicalCenterDbAccessStore = {
		activeSession: null,
		failedAttempts: new Map(),
		cleanupIntervalStarted: false,
		startupCleanupTriggered: false,
	};
}

const store = globalThis.__medicalCenterDbAccessStore;

const allowedEmails = new Set(
	env.DB_ACCESS_ALLOWED_EMAILS.split(",")
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean),
);

const totpSecrets = [
	env.TOTP_TOKEN_1,
	env.TOTP_TOKEN_2,
	env.TOTP_TOKEN_3,
] as const;

const getDbAccessConfigurationIssues = () => {
	const issues: string[] = [];

	if (allowedEmails.size === 0) {
		issues.push("DB_ACCESS_ALLOWED_EMAILS is empty");
	}

	if (env.TOTP_TOKEN_1.trim().length === 0) {
		issues.push("TOTP_TOKEN_1 is missing");
	}

	if (env.TOTP_TOKEN_2.trim().length === 0) {
		issues.push("TOTP_TOKEN_2 is missing");
	}

	if (env.TOTP_TOKEN_3.trim().length === 0) {
		issues.push("TOTP_TOKEN_3 is missing");
	}

	if (env.DB_ACCESS_PGWEB_CONTAINER_NAME.trim().length === 0) {
		issues.push("DB_ACCESS_PGWEB_CONTAINER_NAME is missing");
	}

	if (env.DB_ACCESS_PGWEB_INTERNAL_URL.trim().length === 0) {
		issues.push("DB_ACCESS_PGWEB_INTERNAL_URL is missing");
	}

	if (!existsSync("/var/run/docker.sock")) {
		issues.push("Docker socket is not mounted into the app container");
	}

	return issues;
};

const isDbAccessConfigured = () =>
	getDbAccessConfigurationIssues().length === 0;

const setDbAccessCookie = (
	c: Parameters<typeof setCookie>[0],
	token: string,
) => {
	setCookie(c, DB_ACCESS_COOKIE_NAME, token, {
		path: DB_ACCESS_COOKIE_PATH,
		httpOnly: true,
		secure: env.PROD,
		sameSite: "Strict",
		domain: AUTH_COOKIE_DOMAIN,
		maxAge: env.DB_ACCESS_SESSION_TTL_SECONDS,
	});
};

const clearDbAccessCookie = (c: Parameters<typeof deleteCookie>[0]) => {
	deleteCookie(c, DB_ACCESS_COOKIE_NAME, {
		path: DB_ACCESS_COOKIE_PATH,
		httpOnly: true,
		secure: env.PROD,
		sameSite: "Strict",
		domain: AUTH_COOKIE_DOMAIN,
	});
};

const hashViewerToken = (token: string) => Bun.SHA256.hash(token, "base64url");

const isAllowedDbAccessUser = (email: string) =>
	allowedEmails.has(email.trim().toLowerCase());

const sameOriginGuard: StrictHandler = async (c, next) => {
	const origin = c.req.header("origin");
	const referer = c.req.header("referer");

	if (!origin && !referer) {
		return c.json(
			{
				success: false,
				error: { message: "A same-origin request header is required" },
			},
			403,
		);
	}

	if (origin && origin !== FRONTEND_ORIGIN) {
		return c.json(
			{
				success: false,
				error: { message: "Cross-site requests are not allowed" },
			},
			403,
		);
	}

	if (!origin && referer && !referer.startsWith(FRONTEND_ORIGIN)) {
		return c.json(
			{
				success: false,
				error: { message: "Cross-site requests are not allowed" },
			},
			403,
		);
	}

	await next();
};

const requireDbAccessUser: StrictHandler = async (c, next) => {
	const jwtPayload = c.get("jwtPayload");

	if (!isAllowedDbAccessUser(jwtPayload.email)) {
		return c.json(
			{
				success: false,
				error: { message: "You are not allowed to use emergency DB access" },
			},
			403,
		);
	}

	await next();
};

const createDockerRequest = ({
	method,
	path,
	body,
}: {
	method: string;
	path: string;
	body?: string;
}) =>
	new Promise<{
		statusCode: number;
		headers: IncomingHttpHeaders;
		body: string;
	}>((resolve, reject) => {
		const request = httpRequest(
			{
				socketPath: "/var/run/docker.sock",
				path,
				method,
				headers: body
					? {
							"Content-Type": "application/json",
							"Content-Length": Buffer.byteLength(body),
						}
					: undefined,
			},
			(response) => {
				const chunks: Buffer[] = [];
				response.on("data", (chunk) =>
					chunks.push(
						typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk),
					),
				);
				response.on("end", () => {
					resolve({
						statusCode: response.statusCode ?? 500,
						headers: response.headers,
						body: Buffer.concat(chunks).toString("utf8"),
					});
				});
			},
		);

		request.on("error", reject);

		if (body) {
			request.write(body);
		}

		request.end();
	});

const inspectPgwebContainer = async () => {
	const response = await createDockerRequest({
		method: "GET",
		path: `/containers/${encodeURIComponent(env.DB_ACCESS_PGWEB_CONTAINER_NAME)}/json`,
	});

	if (response.statusCode === 404) {
		throw new Error(
			`pgweb container "${env.DB_ACCESS_PGWEB_CONTAINER_NAME}" was not found`,
		);
	}

	if (response.statusCode < 200 || response.statusCode >= 300) {
		throw new Error(
			`Failed to inspect pgweb container (${response.statusCode}): ${response.body}`,
		);
	}

	return JSON.parse(response.body) as {
		State: {
			Running: boolean;
		};
	};
};

const startPgwebContainer = async () => {
	const response = await createDockerRequest({
		method: "POST",
		path: `/containers/${encodeURIComponent(env.DB_ACCESS_PGWEB_CONTAINER_NAME)}/start`,
	});

	if (response.statusCode !== 204 && response.statusCode !== 304) {
		throw new Error(
			`Failed to start pgweb container (${response.statusCode}): ${response.body}`,
		);
	}
};

const stopPgwebContainer = async () => {
	const response = await createDockerRequest({
		method: "POST",
		path: `/containers/${encodeURIComponent(env.DB_ACCESS_PGWEB_CONTAINER_NAME)}/stop?t=5`,
	});

	if (response.statusCode !== 204 && response.statusCode !== 304) {
		if (response.statusCode === 304 || response.statusCode === 404) {
			return;
		}
		throw new Error(
			`Failed to stop pgweb container (${response.statusCode}): ${response.body}`,
		);
	}
};

const ensurePgwebRunning = async () => {
	const containerInfo = await inspectPgwebContainer();
	if (!containerInfo.State.Running) {
		await startPgwebContainer();
	}
};

const ensurePgwebStopped = async () => {
	try {
		const containerInfo = await inspectPgwebContainer();
		if (containerInfo.State.Running) {
			await stopPgwebContainer();
		}
	} catch (error) {
		console.error("Failed to stop pgweb container", error);
		throw error;
	}
};

const pruneExpiredAttempts = (timestamps: number[], now: number) =>
	timestamps.filter(
		(timestamp) =>
			now - timestamp < env.DB_ACCESS_FAILED_ATTEMPT_WINDOW_MINUTES * 60 * 1000,
	);

const isRateLimited = (userId: number, now: number) => {
	const recentAttempts = pruneExpiredAttempts(
		store.failedAttempts.get(userId) ?? [],
		now,
	);

	store.failedAttempts.set(userId, recentAttempts);

	return recentAttempts.length >= env.DB_ACCESS_MAX_FAILED_ATTEMPTS;
};

const registerFailedAttempt = (userId: number, now: number) => {
	const recentAttempts = pruneExpiredAttempts(
		store.failedAttempts.get(userId) ?? [],
		now,
	);

	recentAttempts.push(now);
	store.failedAttempts.set(userId, recentAttempts);
};

const clearFailedAttempts = (userId: number) => {
	store.failedAttempts.delete(userId);
};

const pruneInactiveViewers = (
	session: ActiveDbAccessSession,
	now: number = Date.now(),
) => {
	for (const [clientId, viewer] of session.viewers.entries()) {
		if (now - viewer.lastSeenAt > env.DB_ACCESS_SESSION_TTL_SECONDS * 1000) {
			session.viewers.delete(clientId);
		}
	}
};

const buildSessionPayload = ({
	session,
	currentUserId,
	viewerToken,
}: {
	session: ActiveDbAccessSession | null;
	currentUserId: number;
	viewerToken?: string;
}) => {
	if (!session) {
		return {
			active: false as const,
			canAccessPgweb: false,
			initiatorName: null,
			initiatorEmail: null,
			reason: null,
			startedAt: null,
			expiresAt: null,
			hardExpiresAt: null,
			viewerCount: 0,
		};
	}

	const canAccessPgweb =
		session.initiatorUserId === currentUserId &&
		typeof viewerToken === "string" &&
		hashViewerToken(viewerToken) === session.viewerTokenHash;

	return {
		active: true as const,
		canAccessPgweb,
		initiatorName: session.initiatorName,
		initiatorEmail: session.initiatorEmail,
		reason: session.reason,
		startedAt: new Date(session.startedAt).toISOString(),
		expiresAt: new Date(
			session.lastHeartbeatAt + env.DB_ACCESS_SESSION_TTL_SECONDS * 1000,
		).toISOString(),
		hardExpiresAt: new Date(session.hardExpiresAt).toISOString(),
		viewerCount: session.viewers.size,
	};
};

const buildStatusPayload = ({
	currentUserId,
	viewerToken,
}: {
	currentUserId: number;
	viewerToken?: string;
}) => ({
	configured: isDbAccessConfigured(),
	configurationIssues: getDbAccessConfigurationIssues(),
	heartbeatIntervalSeconds: HEARTBEAT_INTERVAL_SECONDS,
	sessionTtlSeconds: env.DB_ACCESS_SESSION_TTL_SECONDS,
	maxDurationMinutes: env.DB_ACCESS_MAX_DURATION_MINUTES,
	session: buildSessionPayload({
		session: store.activeSession,
		currentUserId,
		viewerToken,
	}),
});

const writeAuditLog = async ({
	sessionId,
	actorUserId,
	actorEmail,
	actorName,
	action,
	reason,
	details,
}: {
	sessionId?: string | null;
	actorUserId?: number | null;
	actorEmail?: string | null;
	actorName?: string | null;
	action: DbAccessAuditAction;
	reason?: string | null;
	details?: Record<string, unknown>;
}) => {
	await db.insert(dbAccessAuditLogsTable).values({
		sessionId: sessionId ?? null,
		actorUserId: actorUserId ?? null,
		actorEmail: actorEmail ?? null,
		actorName: actorName ?? null,
		action,
		reason: reason ?? null,
		details: details ?? null,
	});
};

const terminateActiveSession = async ({
	action,
	actorUserId,
	actorEmail,
	actorName,
	additionalDetails,
}: {
	action:
		| "session_closed_explicit"
		| "session_closed_inactivity"
		| "session_closed_max_duration";
	actorUserId?: number;
	actorEmail?: string;
	actorName?: string;
	additionalDetails?: Record<string, unknown>;
}) => {
	const session = store.activeSession;
	if (!session) {
		return;
	}

	store.activeSession = null;

	let stopError: string | null = null;
	try {
		await ensurePgwebStopped();
	} catch (error) {
		stopError = error instanceof Error ? error.message : "Unknown stop error";
		console.error("Failed to stop pgweb during session termination", error);
	}

	try {
		await writeAuditLog({
			sessionId: session.sessionId,
			actorUserId: actorUserId ?? session.initiatorUserId,
			actorEmail: actorEmail ?? session.initiatorEmail,
			actorName: actorName ?? session.initiatorName,
			action,
			reason: session.reason,
			details: {
				startedAt: new Date(session.startedAt).toISOString(),
				endedAt: new Date().toISOString(),
				viewerCount: session.viewers.size,
				stopError,
				...additionalDetails,
			},
		});
	} catch (error) {
		console.error("Failed to write break-glass audit log", error);
	}

	if (stopError) {
		try {
			await writeAuditLog({
				sessionId: session.sessionId,
				actorUserId: actorUserId ?? session.initiatorUserId,
				actorEmail: actorEmail ?? session.initiatorEmail,
				actorName: actorName ?? session.initiatorName,
				action: "session_close_failed",
				reason: session.reason,
				details: {
					stopError,
				},
			});
		} catch (error) {
			console.error("Failed to log break-glass close failure", error);
		}
	}
};

const cleanupExpiredSession = async () => {
	const session = store.activeSession;
	if (!session) {
		return;
	}

	const now = Date.now();
	pruneInactiveViewers(session, now);

	if (now >= session.hardExpiresAt) {
		await terminateActiveSession({
			action: "session_closed_max_duration",
		});
		return;
	}

	if (
		session.viewers.size === 0 &&
		now - session.lastHeartbeatAt >= env.DB_ACCESS_SESSION_TTL_SECONDS * 1000
	) {
		await terminateActiveSession({
			action: "session_closed_inactivity",
		});
	}
};

const initializeDbAccessLifecycle = () => {
	if (!store.cleanupIntervalStarted) {
		store.cleanupIntervalStarted = true;
		const interval = setInterval(() => {
			void cleanupExpiredSession();
		}, 1000);
		interval.unref?.();
	}

	if (!store.startupCleanupTriggered && existsSync("/var/run/docker.sock")) {
		store.startupCleanupTriggered = true;
		void ensurePgwebStopped().then(
			async () => {
				try {
					await writeAuditLog({
						action: "session_closed_startup",
						details: {
							message: "Ensured pgweb is stopped during app startup",
						},
					});
				} catch (error) {
					console.error("Failed to log startup pgweb shutdown", error);
				}
			},
			(error) => {
				console.error("Failed to ensure pgweb is stopped on startup", error);
			},
		);
	}
};

const rewriteProxyHtml = (html: string) =>
	html
		.replaceAll('href="/', 'href="/api/dbAccess/proxy/')
		.replaceAll('src="/', 'src="/api/dbAccess/proxy/')
		.replaceAll('action="/', 'action="/api/dbAccess/proxy/')
		.replaceAll("url(/", "url(/api/dbAccess/proxy/")
		.replaceAll('content="/', 'content="/api/dbAccess/proxy/');

const rewriteLocationHeader = (location: string) => {
	if (location.startsWith("/")) {
		return `/api/dbAccess/proxy${location}`;
	}

	try {
		const upstreamUrl = new URL(location);
		const proxyBase = new URL(env.DB_ACCESS_PGWEB_INTERNAL_URL);
		if (upstreamUrl.origin === proxyBase.origin) {
			return `/api/dbAccess/proxy${upstreamUrl.pathname}${upstreamUrl.search}${upstreamUrl.hash}`;
		}
	} catch {
		return location;
	}

	return location;
};

const proxyPgwebRequest = async (c: StrictContext) => {
	const jwtPayload = c.get("jwtPayload");
	await cleanupExpiredSession();

	if (!isDbAccessConfigured()) {
		return c.json(
			{
				success: false,
				error: { message: "Emergency DB access is not configured" },
			},
			503,
		);
	}

	const session = store.activeSession;
	const viewerToken = getCookie(c, DB_ACCESS_COOKIE_NAME);
	const canAccess =
		!!session &&
		jwtPayload.id === session.initiatorUserId &&
		typeof viewerToken === "string" &&
		hashViewerToken(viewerToken) === session.viewerTokenHash;

	if (!session || !canAccess) {
		clearDbAccessCookie(c);
		return c.json(
			{
				success: false,
				error: { message: "No active emergency DB session for this browser" },
			},
			403,
		);
	}

	const requestUrl = new URL(c.req.raw.url);
	const proxyPrefix = "/api/dbAccess/proxy";
	const upstreamPath = requestUrl.pathname.slice(proxyPrefix.length) || "/";
	const upstreamUrl = new URL(
		`${upstreamPath.startsWith("/") ? upstreamPath : `/${upstreamPath}`}${requestUrl.search}`,
		env.DB_ACCESS_PGWEB_INTERNAL_URL,
	);

	const upstreamHeaders = new Headers(c.req.raw.headers);
	upstreamHeaders.delete("host");
	upstreamHeaders.delete("cookie");
	upstreamHeaders.set("x-forwarded-host", requestUrl.host);
	upstreamHeaders.set(
		"x-forwarded-proto",
		requestUrl.protocol.replace(":", ""),
	);
	upstreamHeaders.set("x-forwarded-prefix", proxyPrefix);

	const body =
		c.req.method === "GET" || c.req.method === "HEAD"
			? undefined
			: await c.req.arrayBuffer();

	const upstreamResponse = await fetch(upstreamUrl, {
		method: c.req.method,
		headers: upstreamHeaders,
		body,
		redirect: "manual",
	});

	const responseHeaders = new Headers(upstreamResponse.headers);
	responseHeaders.delete("content-security-policy");
	responseHeaders.delete("x-frame-options");
	responseHeaders.set("cache-control", "no-store");

	const location = responseHeaders.get("location");
	if (location) {
		responseHeaders.set("location", rewriteLocationHeader(location));
	}

	const contentType = responseHeaders.get("content-type") ?? "";
	if (contentType.includes("text/html")) {
		const html = rewriteProxyHtml(await upstreamResponse.text());
		return new Response(html, {
			status: upstreamResponse.status,
			headers: responseHeaders,
		});
	}

	return new Response(upstreamResponse.body, {
		status: upstreamResponse.status,
		headers: responseHeaders,
	});
};

initializeDbAccessLifecycle();

const dbAccess = createStrictHono()
	.use(requireDbAccessUser)
	.get("/status", async (c) => {
		await cleanupExpiredSession();

		const jwtPayload = c.get("jwtPayload");
		const viewerToken = getCookie(c, DB_ACCESS_COOKIE_NAME);
		const statusPayload = buildStatusPayload({
			currentUserId: jwtPayload.id,
			viewerToken,
		});

		if (!statusPayload.session.canAccessPgweb && viewerToken) {
			clearDbAccessCookie(c);
		}

		return c.json({
			success: true,
			data: statusPayload,
		});
	})
	.post(
		"/validate",
		sameOriginGuard,
		strictValidator(
			"json",
			z.object({
				codes: z.tuple([
					z.string().regex(/^\d{6}$/),
					z.string().regex(/^\d{6}$/),
					z.string().regex(/^\d{6}$/),
				]),
				reason: z.string().trim().min(10).max(2048),
			}),
		),
		async (c) => {
			await cleanupExpiredSession();

			const jwtPayload = c.get("jwtPayload");
			const now = Date.now();

			if (!isDbAccessConfigured()) {
				await writeAuditLog({
					actorUserId: jwtPayload.id,
					actorEmail: jwtPayload.email,
					actorName: jwtPayload.name,
					action: "session_open_failed_config",
				});

				return c.json(
					{
						success: false,
						error: { message: "Emergency DB access is not configured" },
					},
					503,
				);
			}

			if (store.activeSession) {
				await writeAuditLog({
					sessionId: store.activeSession.sessionId,
					actorUserId: jwtPayload.id,
					actorEmail: jwtPayload.email,
					actorName: jwtPayload.name,
					action: "session_open_denied_active",
					details: {
						activeSessionId: store.activeSession.sessionId,
						activeInitiatorEmail: store.activeSession.initiatorEmail,
					},
				});

				return c.json(
					{
						success: false,
						error: {
							message:
								"An emergency DB access session is already active for another browser",
						},
					},
					409,
				);
			}

			if (isRateLimited(jwtPayload.id, now)) {
				await writeAuditLog({
					actorUserId: jwtPayload.id,
					actorEmail: jwtPayload.email,
					actorName: jwtPayload.name,
					action: "session_open_failed_rate_limited",
				});

				return c.json(
					{
						success: false,
						error: {
							message:
								"Too many failed TOTP attempts. Please wait before trying again.",
						},
					},
					429,
				);
			}

			const { codes, reason } = c.req.valid("json");
			const isValid = validateAllTotpCodes({
				secrets: totpSecrets,
				codes,
				now,
			});

			if (!isValid) {
				registerFailedAttempt(jwtPayload.id, now);
				await writeAuditLog({
					actorUserId: jwtPayload.id,
					actorEmail: jwtPayload.email,
					actorName: jwtPayload.name,
					action: "session_open_failed_totp",
					reason,
				});

				return c.json(
					{
						success: false,
						error: {
							message: "The supplied TOTP codes were invalid or expired",
						},
					},
					403,
				);
			}

			clearFailedAttempts(jwtPayload.id);

			try {
				await ensurePgwebRunning();
			} catch (error) {
				console.error("Failed to start pgweb container", error);
				return c.json(
					{
						success: false,
						error: {
							message:
								"Emergency DB access could not be started. Please contact an administrator.",
						},
					},
					500,
				);
			}

			const viewerToken = randomUUID();
			const session: ActiveDbAccessSession = {
				sessionId: randomUUID(),
				initiatorUserId: jwtPayload.id,
				initiatorEmail: jwtPayload.email,
				initiatorName: jwtPayload.name,
				reason,
				startedAt: now,
				lastHeartbeatAt: now,
				hardExpiresAt: now + env.DB_ACCESS_MAX_DURATION_MINUTES * 60 * 1000,
				viewerTokenHash: hashViewerToken(viewerToken),
				viewers: new Map(),
			};

			store.activeSession = session;

			try {
				await writeAuditLog({
					sessionId: session.sessionId,
					actorUserId: jwtPayload.id,
					actorEmail: jwtPayload.email,
					actorName: jwtPayload.name,
					action: "session_opened",
					reason,
					details: {
						startedAt: new Date(session.startedAt).toISOString(),
						hardExpiresAt: new Date(session.hardExpiresAt).toISOString(),
					},
				});
			} catch (error) {
				store.activeSession = null;
				clearDbAccessCookie(c);
				await ensurePgwebStopped().catch((stopError) => {
					console.error(
						"Failed to roll back pgweb after audit failure",
						stopError,
					);
				});

				console.error(
					"Failed to create mandatory break-glass audit log",
					error,
				);
				return c.json(
					{
						success: false,
						error: {
							message:
								"Emergency DB access audit logging failed, so access was not opened.",
						},
					},
					500,
				);
			}

			setDbAccessCookie(c, viewerToken);

			return c.json({
				success: true,
				data: buildStatusPayload({
					currentUserId: jwtPayload.id,
					viewerToken,
				}),
			});
		},
	)
	.post(
		"/heartbeat",
		sameOriginGuard,
		strictValidator(
			"json",
			z.object({
				clientId: z.string().uuid(),
			}),
		),
		async (c) => {
			await cleanupExpiredSession();

			const jwtPayload = c.get("jwtPayload");
			const viewerToken = getCookie(c, DB_ACCESS_COOKIE_NAME);
			const session = store.activeSession;

			if (
				!session ||
				!viewerToken ||
				jwtPayload.id !== session.initiatorUserId ||
				hashViewerToken(viewerToken) !== session.viewerTokenHash
			) {
				clearDbAccessCookie(c);
				return c.json(
					{
						success: false,
						error: {
							message:
								"No active emergency DB access session is available for this browser",
						},
					},
					403,
				);
			}

			const now = Date.now();
			const { clientId } = c.req.valid("json");

			session.lastHeartbeatAt = now;
			session.viewers.set(clientId, {
				lastSeenAt: now,
			});

			setDbAccessCookie(c, viewerToken);

			return c.json({
				success: true,
				data: buildStatusPayload({
					currentUserId: jwtPayload.id,
					viewerToken,
				}),
			});
		},
	)
	.post(
		"/disconnect",
		sameOriginGuard,
		strictValidator(
			"json",
			z.object({
				clientId: z.string().uuid(),
			}),
		),
		async (c) => {
			await cleanupExpiredSession();

			const jwtPayload = c.get("jwtPayload");
			const viewerToken = getCookie(c, DB_ACCESS_COOKIE_NAME);
			const session = store.activeSession;

			if (
				session &&
				viewerToken &&
				jwtPayload.id === session.initiatorUserId &&
				hashViewerToken(viewerToken) === session.viewerTokenHash
			) {
				session.viewers.delete(c.req.valid("json").clientId);
			}

			return c.json({
				success: true,
				data: buildStatusPayload({
					currentUserId: jwtPayload.id,
					viewerToken,
				}),
			});
		},
	)
	.post("/close", sameOriginGuard, async (c) => {
		await cleanupExpiredSession();

		const jwtPayload = c.get("jwtPayload");
		const viewerToken = getCookie(c, DB_ACCESS_COOKIE_NAME);
		const session = store.activeSession;

		if (
			!session ||
			!viewerToken ||
			jwtPayload.id !== session.initiatorUserId ||
			hashViewerToken(viewerToken) !== session.viewerTokenHash
		) {
			clearDbAccessCookie(c);
			return c.json(
				{
					success: false,
					error: {
						message:
							"No active emergency DB access session is available for this browser",
					},
				},
				403,
			);
		}

		await terminateActiveSession({
			action: "session_closed_explicit",
			actorUserId: jwtPayload.id,
			actorEmail: jwtPayload.email,
			actorName: jwtPayload.name,
		});
		clearDbAccessCookie(c);

		return c.json({
			success: true,
			data: buildStatusPayload({
				currentUserId: jwtPayload.id,
			}),
		});
	})
	.get("/proxy", async (c) => proxyPgwebRequest(c))
	.get("/proxy/*", async (c) => proxyPgwebRequest(c))
	.post("/proxy", sameOriginGuard, async (c) => proxyPgwebRequest(c))
	.post("/proxy/*", sameOriginGuard, async (c) => proxyPgwebRequest(c))
	.put("/proxy/*", sameOriginGuard, async (c) => proxyPgwebRequest(c))
	.delete("/proxy/*", sameOriginGuard, async (c) => proxyPgwebRequest(c));

export default dbAccess;
