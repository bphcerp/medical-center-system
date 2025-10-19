import "dotenv/config";
import { Hono } from "hono";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import env from "@/config/env";
import unauthenticated from "./auth";
import authenticated from "./test";

// You can specify any property from the node-postgres connection options
export const db = drizzle({
	connection: {
		connectionString: env.DATABASE_URL,
	},
});

const app = new Hono().basePath("/api");

app.route("/", unauthenticated);
app.route("/", authenticated);

export default app;
