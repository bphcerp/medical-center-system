import {
	createFileRoute,
	Outlet,
	useLocation,
	useRouter,
} from "@tanstack/react-router";
import { ShieldUser } from "lucide-react";
import { useEffect } from "react";
import TopBar from "@/components/topbar";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/admin")({
	staticData: {
		requiredPermissions: ["admin"],
		icon: ShieldUser,
		name: "Admin Dashboard",
	},
	component: AdminRoot,
});

function AdminRoot() {
	return (
		<SidebarProvider>
			<AdminDashboard />
		</SidebarProvider>
	);
}

function AdminDashboard() {
	const { flatRoutes, navigate } = useRouter();
	const location = useLocation();
	const { open } = useSidebar();

	const childRoutes = flatRoutes.filter(
		(route) =>
			route.fullPath.startsWith("/admin") &&
			route.fullPath !== "/admin" &&
			!route.id.includes("$"),
	);

	const items = childRoutes.map((route) => ({
		title:
			route.options.staticData?.name ??
			(route.path
				? route.path
						.charAt(0)
						.toUpperCase()
						.concat(route.path.slice(1))
						.replace(/-/g, " ")
				: "Unknown"),
		url: route.fullPath,
		icon: route.options.staticData?.icon ?? ShieldUser,
	}));

	useEffect(() => {
		if (location.pathname === "/admin" && items.length > 0) {
			navigate({ to: items[0].url, replace: true });
		}
	}, [location.pathname, items, navigate]);

	return (
		<div className="w-full">
			<TopBar title="Admin Dashboard" />
			<div className="flex">
				<Sidebar className="relative h-[calc(100dvh-4.5rem)]">
					<SidebarContent>
						<SidebarGroup>
							<SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									{items.map((item) => (
										<SidebarMenuItem key={item.title}>
											<SidebarMenuButton
												asChild
												className={`cursor-pointer transition duration-200 ${item.url === location.pathname ? "bg-muted" : ""}`}
											>
												<button
													key={item.url}
													type="button"
													onClick={() => {
														navigate({ to: item.url, replace: true });
													}}
												>
													<item.icon />
													<span>{item.title}</span>
												</button>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</SidebarContent>
				</Sidebar>
				<main className="w-full px-6 py-4">
					{open || <SidebarTrigger />}
					<Outlet />
				</main>
			</div>
		</div>
	);
}
