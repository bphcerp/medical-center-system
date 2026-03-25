import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import env from "../lib/env";

const db = drizzle({
	connection: {
		connectionString: env.DATABASE_URL,
	},
});

async function runMigrations() {
	try {
		await migrate(db, { migrationsFolder: "./drizzle" });
		console.log("Database migrations completed successfully.");
	} catch (error) {
		console.error("Database migration failed.", error);
		process.exit(1);
	}
}

await runMigrations();
