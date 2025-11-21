import "dotenv/config";
import type { StrictHandler } from "@/lib/types/api";
import type { Permission } from "@/lib/types/permissions";

export const rbacCheck: ({
	permissions,
}: {
	permissions: Permission[];
}) => StrictHandler =
	({ permissions }) =>
	async (c, next) => {
		const jwtPayload = c.get("jwtPayload");
		const existing = new Set(jwtPayload.role.allowed);
		for (let i = 0; i < permissions.length; i++) {
			if (!existing.has(permissions[i])) {
				return c.json(
					{
						success: false,
						error: {
							message: "Missing permissions",
							details: { requiredPermission: permissions[i] },
						},
					},
					403,
				);
			}
		}
		await next();
	};
