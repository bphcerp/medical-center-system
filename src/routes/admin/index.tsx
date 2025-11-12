import { createFileRoute, redirect } from "@tanstack/react-router";
import { ShieldUser } from "lucide-react";

export const Route = createFileRoute("/admin/")({
	beforeLoad: () => {
		throw redirect({ to: "/admin/user" });
	},
	staticData: {
		requiredPermissions: ["admin"],
		icon: ShieldUser,
		name: "Admin Dashboard",
	},
});
