/// <reference types="vite/client" />

import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { CookiesProvider } from "react-cookie";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import appCss from "@/styles/app.css?url";

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

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="bg-background">
				<SidebarProvider className="block">
					<CookiesProvider>{children}</CookiesProvider>
				</SidebarProvider>
				<Scripts />
				<Toaster
					position="top-right"
					richColors
					theme="light"
					toastOptions={{
						classNames: {},
					}}
				/>
			</body>
		</html>
	);
}
