import "dotenv/config";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import env from "@/lib/env";
import { createStrictHono } from "@/lib/types/api";
import { authenticated, unauthenticated } from "./auth";
// You can specify any property from the node-postgres connection options
export const db = drizzle({
	connection: {
		connectionString: env.DATABASE_URL,
	},
});

const app = createStrictHono()
	.basePath("/api")
	.route("/", unauthenticated)
	.route("/", authenticated);

export default app;
