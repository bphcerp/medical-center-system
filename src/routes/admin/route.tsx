import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { CircleUser, Library } from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/admin")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SidebarProvider className="flex w-full items-stretch h-screen">
			<AppSidebar />
			<main className="flex-1 p-4 lg:p-10 pb-0">
				<Outlet />
			</main>
		</SidebarProvider>
	)
}

function AppSidebar() {
	return (
		<Sidebar collapsible="none">
			<SidebarHeader>
				<SidebarGroup>
					<h1 className="text-3xl font-bold">Admin</h1>
				</SidebarGroup>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size={"lg"} asChild>
								<Link to="/admin/user">
									<CircleUser />
									User management
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>

						<SidebarMenuItem>
							<SidebarMenuButton size={"lg"} asChild>
								<Link to="/admin/role">
									<Library />
									Role management
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	)
}
