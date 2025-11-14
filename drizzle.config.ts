import env from "@/config/env";
import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import "./compression-polyfill";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/*",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
		// url: "postgres://medc:medc2026@localhost:5433/medc",
	},
});
