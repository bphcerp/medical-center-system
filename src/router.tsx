import { createRouter } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { Permission } from "./lib/types/permissions";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new router instance
export const getRouter = () => {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
	});
};

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
	// Allows us to check required permissions on any route
	export interface StaticDataRouteOption {
		requiredPermissions?: Permission[];
		icon?: LucideIcon;
		name?: string;
	}
}
