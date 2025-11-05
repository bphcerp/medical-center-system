import { getTableColumns } from "drizzle-orm";
import { Hono } from "hono";
import { rolesTable } from "@/db/auth";
import { db } from ".";
import { rbacCheck } from "./rbac";

const role = new Hono().get(
	"/all",
	rbacCheck({ permissions: ["manage-users"] }),
	async (c) => {
		const { id, name } = getTableColumns(rolesTable);

		const roles = await db.select({ id, name }).from(rolesTable);

		return c.json({ roles: roles });
	},
);

export default role;
