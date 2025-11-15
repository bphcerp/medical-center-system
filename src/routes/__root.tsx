/// <reference types="vite/client" />

import {
	createRootRoute,
	HeadContent,
	redirect,
	Scripts,
	useRouter,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthContext, type AuthContextData } from "@/lib/contexts/auth";
import appCss from "@/styles/app.css?url";
import { client } from "./api/$";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Medical Center",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	ssr: false,
	shellComponent: RootDocument,
});

async function checkAuth() {
	return client.api.user.$get();
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const [authContextData, setAuthContextData] = useState<AuthContextData>({
		allowedRoutes: [],
	});
	const { flatRoutes } = useRouter();

	useEffect(() => {
		checkAuth().then(async (res) => {
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

			setAuthContextData((old) => ({
				...old,
				allowedRoutes: flatRoutes.filter(
					(route) =>
						route.options.staticData?.requiredPermissions &&
						user.role.allowed.some((perm) =>
							route.options.staticData?.requiredPermissions?.includes(perm),
						),
				),
			}));
		});
	}, [flatRoutes]);

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="bg-background">
				<AuthContext value={authContextData}>
					{children}
					<Scripts />
				</AuthContext>
			</body>
		</html>
	);
}
