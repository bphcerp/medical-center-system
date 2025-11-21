import { useRouter } from "@tanstack/react-router";
import { decode } from "hono/jwt";
import { useCookies } from "react-cookie";
import type { CookieValues } from "@/api/auth";
import type { JWTPayload } from "@/lib/types/api";
import type { Permission } from "../types/permissions";

const useAuth = (requiredPermissions: Permission[] = []) => {
	const { flatRoutes, navigate } = useRouter();
	const [cookies] = useCookies<"token", CookieValues>(["token"]);

	try {
		const { header: _, payload } = decode(cookies.token || "");
		const payloadTyped = payload as JWTPayload;

		const allowedRoutes = flatRoutes.filter(
			(route) =>
				route.options.staticData?.requiredPermissions &&
				payloadTyped.role.allowed.some((perm) =>
					route.options.staticData?.requiredPermissions?.includes(perm),
				),
		);

		const hasRequiredPermissions = requiredPermissions.every((perm) =>
			payloadTyped.role.allowed.includes(perm),
		);
		if (!hasRequiredPermissions) {
			navigate({ to: "/" });
			alert("You do not have the required permissions to access this page.");
		}

		return { allowedRoutes };
	} catch (e) {
		console.error("Error decoding token in useAuth:", e);
		navigate({ to: "/login" });
		return { allowedRoutes: [] };
	}
};

export default useAuth;
