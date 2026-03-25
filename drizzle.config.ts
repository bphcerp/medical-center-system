import env from "@/lib/env";
import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import "./compression-polyfill";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/*.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
});
