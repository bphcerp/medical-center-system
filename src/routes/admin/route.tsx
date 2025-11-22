import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { ShieldUser } from "lucide-react";
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

const items = [
	{
		title: "User Management",
		url: "/admin/user",
		icon: ShieldUser,
	},
	{
		title: "Role Management",
		url: "/admin/role",
		icon: ShieldUser,
	},
	{
		title: "OTP Override Logs",
		url: "/admin/otp-overrides",
		icon: ShieldUser,
	},
];

function AdminDashboard() {
	const { navigate } = useRouter();
	const { open } = useSidebar();

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
											<SidebarMenuButton asChild>
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
