import { redirect, useRouter } from "@tanstack/react-router";
import { House, User } from "lucide-react";
import { useEffect, useState } from "react";
import { client } from "@/routes/api/$";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

async function checkAuth() {
	return client.api.user.$get();
}

const TopBar = ({ title }: { title: string }) => {
	const { flatRoutes, navigate } = useRouter();
	const [linkCount, setLinkCount] = useState(0);
	document.title = title;

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

			setLinkCount(
				flatRoutes.filter(
					(route) =>
						route.options.staticData?.requiredPermissions &&
						user.role.allowed.some((perm) =>
							route.options.staticData?.requiredPermissions?.includes(perm),
						),
				).length,
			);
		});
	}, [flatRoutes]);

	return (
		<div className="p-4 flex justify-between items-center border-b border-border">
			<div className="flex gap-4 items-center">
				{linkCount > 1 && (
					<Button
						variant="outline"
						className="p-6"
						onClick={() => navigate({ to: "/" })}
					>
						<House className="size-6" />
					</Button>
				)}
				<span className="text-2xl font-bold">{title}</span>
			</div>
			<DropdownMenu>
				<DropdownMenuTrigger>
					<Avatar className="border-2 border-border size-10">
						<AvatarFallback>
							<User />
						</AvatarFallback>
					</Avatar>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuLabel className="font-medium">
						My Account
					</DropdownMenuLabel>
					<DropdownMenuItem
						variant="destructive"
						// Needs to use window.location.assign so that Tanstack Router doesn't interfere and show a 404
						onClick={() => window.location.assign("/api/logout")}
					>
						Log Out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
};

export default TopBar;
