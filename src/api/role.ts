import { getTableColumns } from "drizzle-orm";
import { Hono } from "hono";
import { rolesTable } from "@/db/auth";
import { db } from ".";
import { rbacCheck } from "./rbac";

const role = new Hono().get(
	"/all",
	rbacCheck({ permissions: ["manage-users"] }),
	async (c) => {
		const { id, name, allowed } = getTableColumns(rolesTable);

		const roles = await db.select({ id, name, allowed }).from(rolesTable);

		return c.json({ roles: roles });
	},
);

export default role;
