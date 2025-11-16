import { type AnyRoute, redirect, useRouter } from "@tanstack/react-router";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { client } from "@/routes/api/$";

type AuthContextData = {
	allowedRoutes: AnyRoute[];
	logOut: () => Promise<void>;
	logIn: (username: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({
	allowedRoutes: [],
	logOut: async () => {},
	logIn: async () => {},
});

async function checkAuth() {
	return client.api.user.$get();
}

export function useAuth() {
	return useContext(AuthContext);
}

export function AuthProvider({ children }: React.PropsWithChildren) {
	const [allowedRoutes, setAllowedRoutes] = useState<AnyRoute[]>([]);
	const { flatRoutes, navigate } = useRouter();

	const invalidate = useCallback(async () => {
		console.log("do");
		const res = await checkAuth();
		if (res.status !== 200) {
			throw redirect({
				to: "/login",
			});
		}
		const user = await res.json();
		if ("error" in user) {
			throw redirect({
				to: "/login",
			});
		}

		setAllowedRoutes(
			flatRoutes.filter(
				(route) =>
					route.options.staticData?.requiredPermissions &&
					user.role.allowed.some((perm) =>
						route.options.staticData?.requiredPermissions?.includes(perm),
					),
			),
		);
	}, [flatRoutes]);

	const logOut = useCallback(async () => {
		window.location.assign("/api/logout");
	}, []);

	const logIn = async (username: string, password: string) => {
		const res = await (
			await client.api.login.$post({
				json: {
					username: username as string,
					password: password as string,
				},
			})
		).json();
		if ("error" in res) {
			alert(res.error);
		}

		invalidate();

		navigate({ to: "/" });
	};

	useEffect(() => {
		invalidate();
	}, [invalidate]);
	return (
		<AuthContext value={{ allowedRoutes, logIn, logOut }}>
			{children}
		</AuthContext>
	);
}
