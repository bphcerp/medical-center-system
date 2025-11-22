import { useLocation, useRouter } from "@tanstack/react-router";
import { House, User } from "lucide-react";
import useAuth from "@/lib/hooks/useAuth";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const TopBar = ({ title }: { title: string }) => {
	const { navigate } = useRouter();
	const location = useLocation();
	const { allowedRoutes } = useAuth();
	document.title = title;

	return (
		<div className="p-4 flex justify-between items-center border-b border-border">
			<div className="flex gap-4 items-center">
				{allowedRoutes.length > 1 && location.pathname !== "/" && (
					<Button
						variant="outline"
						className="p-4 aspect-square"
						onClick={() => navigate({ to: "/" })}
					>
						<House className="size-4" />
					</Button>
				)}
				<span className="text-2xl lg:text-3xl font-bold">{title}</span>
			</div>
			<DropdownMenu>
				<DropdownMenuTrigger>
					<div className="border-2 border-border p-2 rounded-full cursor-pointer hover:bg-accent">
						<User className="size-5" />
					</div>
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
