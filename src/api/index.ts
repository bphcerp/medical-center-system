import { Hono } from "hono";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import env from "@/config/env";
import { usersTable } from "@/db/auth";

// You can specify any property from the node-postgres connection options
const db = drizzle({
	connection: {
		connectionString: env.DATABASE_URL,
	},
});

const app = new Hono()
	.basePath("/api")
	.get("/", async (c) => {
		const users = await db.select().from(usersTable);
		console.log(users);
		return c.json(users);
	})
	.get("/ping", (c) => c.text("pong"));

export default app;
