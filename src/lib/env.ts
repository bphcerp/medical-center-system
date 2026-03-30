import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Trying to load .env if running outside docker and cwd is server
dotenv.config({
	path: path.resolve(process.cwd(), "../.env"),
});

const serverSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	DB_HOST: z.string().min(1),
	POSTGRES_USER: z.string().min(1),
	POSTGRES_PASSWORD: z.string().min(1),
	POSTGRES_DB: z.string().min(1),
	PGPORT: z.coerce.number().int().positive().default(5432),
	FRONTEND_URL: z.url().min(1),
	FRONTEND_PORT: z.coerce.number().int().positive().default(3000),
	JWT_SECRET: z.string().min(1),
	SEAWEEDFS_MASTER: z.url().min(1),
	EMAIL_USER: z.string().min(1),
	EMAIL_PASS: z.string().min(1),
	GOOGLE_CLIENT_SECRET: z.string(),
	GOOGLE_CLIENT_ID: z.string(),
	GOOGLE_REDIRECT_URI: z.string(),
	OAUTH_STATE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
	TOTP_TOKEN_1: z.string().default(""),
	TOTP_TOKEN_2: z.string().default(""),
	TOTP_TOKEN_3: z.string().default(""),
	DB_ACCESS_ALLOWED_EMAILS: z.string().default(""),
	DB_ACCESS_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60),
	DB_ACCESS_MAX_DURATION_MINUTES: z.coerce
		.number()
		.int()
		.positive()
		.default(15),
	DB_ACCESS_MAX_FAILED_ATTEMPTS: z.coerce.number().int().positive().default(5),
	DB_ACCESS_FAILED_ATTEMPT_WINDOW_MINUTES: z.coerce
		.number()
		.int()
		.positive()
		.default(10),
	DB_ACCESS_PGWEB_CONTAINER_NAME: z.string().default("medical-center-pgweb"),
	DB_ACCESS_PGWEB_INTERNAL_URL: z.url().default("http://pgweb:8090"),
});

const parsed = serverSchema.parse(process.env, {
	error: (_) =>
		"invalid/missing environment variables, please check .env.example for a list of required variables",
});

export const DATABASE_URL = `postgres://${parsed.POSTGRES_USER}:${parsed.POSTGRES_PASSWORD}@${parsed.DB_HOST}:${parsed.PGPORT}/${parsed.POSTGRES_DB}`;
export const PROD = parsed.NODE_ENV === "production";

export default {
	DATABASE_URL,
	PROD,
	...parsed,
};
