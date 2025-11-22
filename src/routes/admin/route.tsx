import {
	createFileRoute,
	Outlet,
	useLocation,
	useRouter,
} from "@tanstack/react-router";
import { House, Menu, ShieldUser } from "lucide-react";
import { useEffect } from "react";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/admin")({
	staticData: {
		requiredPermissions: ["admin"],
		icon: ShieldUser,
		name: "Admin Dashboard",
	},
	component: AdminDashboard,
});

function AdminDashboard() {
	const { flatRoutes, navigate } = useRouter();
	const location = useLocation();
	const { setOpenMobile, isMobile } = useSidebar();

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

	useEffect(() => {
		if (isMobile) {
			setOpenMobile(true);
		}
	}, [isMobile, setOpenMobile]);

	return (
		<div className="w-full">
			<TopBar
				title="Admin Dashboard"
				actionButton={
					isMobile ? (
						<Button
							variant="outline"
							className="p-4 aspect-square"
							onClick={() => setOpenMobile(true)}
						>
							<Menu className="size-4" />
						</Button>
					) : undefined
				}
			/>
			<div className="flex h-after-topbar">
				<Sidebar className="relative h-full">
					<SidebarContent>
						<SidebarGroup>
							{isMobile && (
								<Button
									variant="outline"
									className="p-4 flex font-semibold h-12 w-full mb-4"
									onClick={() => navigate({ to: "/" })}
								>
									<House className="size-4" />
									Go Home
								</Button>
							)}
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
														if (isMobile) {
															setOpenMobile(false);
														}
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
					<Outlet />
				</main>
			</div>
		</div>
	);
}
