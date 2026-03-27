import { eq } from "drizzle-orm";
import { rolesTable, usersTable } from "src/db/auth";
import { db } from ".";

export const getPermissionsForUser = async (
	userId: number,
): Promise<string[]> => {
	const result = await db
		.select({ allowed: rolesTable.allowed })
		.from(usersTable)
		.innerJoin(rolesTable, eq(usersTable.role, rolesTable.id))
		.where(eq(usersTable.id, userId))
		.limit(1);

	return result[0]?.allowed ?? [];
};
