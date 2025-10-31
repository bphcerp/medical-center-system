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
	PGPORT: z.coerce.number().default(5432),
	FRONTEND_URL: z.url().min(1),
	FRONTEND_PORT: z.coerce.number().default(3000),
	JWT_SECRET: z.string().min(1),
	SEAWEEDFS_MASTER: z.string().default("http://seaweedfs-master:9333"),
	SEAWEEDFS_VOLUME_URL: z.string().default("http://localhost:8080"),
});

const parsed = serverSchema.parse(process.env);

export const DATABASE_URL = `postgres://${parsed.POSTGRES_USER}:${parsed.POSTGRES_PASSWORD}@${parsed.DB_HOST}:${parsed.PGPORT}/${parsed.POSTGRES_DB}`;
export const PROD = parsed.NODE_ENV === "production";

export default {
	DATABASE_URL,
	PROD,
	...parsed,
};
