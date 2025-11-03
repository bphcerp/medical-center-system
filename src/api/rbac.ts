import "dotenv/config";
import { Hono, type MiddlewareHandler } from "hono";
import type { JWTPayload } from "./auth";

type Permissions = "test" | "vitals" | "manage-users" | "doctor";

export const rbacCheck: ({
	permissions,
}: {
	permissions: Permissions[];
}) => MiddlewareHandler =
	({ permissions }) =>
	async (c, next) => {
		const jwtPayload: JWTPayload = c.get("jwtPayload");
		const existing = new Set(jwtPayload.role.allowed);
		for (let i = 0; i < permissions.length; i++) {
			if (!existing.has(permissions[i])) {
				return c.json({ error: "Insufficient Permissions" }, 403);
			}
		}
		await next();
	};

const rbac = new Hono()
	.use(rbacCheck({ permissions: ["test"] }))
	.get("/", async (c) => {
		return c.json({ message: "You have the test permission" });
	});

export default rbac;
