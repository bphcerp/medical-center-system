import { SelectTrigger } from "@radix-ui/react-select";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { type Permission, Permissions } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn, handleUnauthorized } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/admin/role")({
	component: RouteComponent,
	loader: async () => {
		const data = await client.api.role.all.$get();
		handleUnauthorized(data.status);

		const roles = (await data.json()).roles;

		return { roles };
	},
});

function RouteComponent() {
	const { roles } = Route.useLoaderData();

	return (
		<div className="flex flex-col gap-3 lg:w-3/4">
			<h1 className="text-2xl font-bold">Role Management</h1>
			<Table>
				<TableHeader>
					<TableRow>
						<TableCell className="w-1/4">Role</TableCell>
						<TableCell>Permissions</TableCell>
					</TableRow>
				</TableHeader>
				<TableBody>
					{roles.map((role) => (
						<RowItem
							key={role.id}
							name={role.name}
							perms={role.allowed as Permission[]}
						/>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function RowItem({
	name,
	perms: originalPerms,
}: {
	name: string;
	perms: Permission[];
}) {
	const [perms, setPerms] = useState(originalPerms);
	const [unusedPerms, setUnusedPerms] = useState(
		Permissions.filter((p) => !originalPerms.includes(p)),
	);

	const [editMode, setEditMode] = useState(false);

	const handleDeletePerm = (perm: Permission) => {
		if (!editMode) setEditMode(true);
		setPerms((prev) => prev.filter((p) => p !== perm));
		setUnusedPerms((prev) => [...prev, perm]);
	};

	const handleAddPerm = (perm: Permission) => {
		if (!editMode) setEditMode(true);
		setPerms((prev) => [...prev, perm]);
		setUnusedPerms((prev) => prev.filter((p) => p !== perm));
	};

	const handleCancelEdit = () => {
		setEditMode(false);
		setPerms(originalPerms);
		setUnusedPerms(
			Permissions.filter((p) => !originalPerms.includes(p)),
		);
	};

	return (
		<TableRow>
			<TableCell>{name}</TableCell>
			<TableCell className="flex gap-6 pr-2">
				<div className="flex flex-1 flex-wrap gap-2 items-center">
					{perms.map((perm) => (
						<PermBadge
							key={perm}
							onClick={() => handleDeletePerm(perm)}
							className="group relative"
							destructive
						>
							<span className="translate-x-3 group-hover:translate-x-1 transition-transform">
								{perm}
							</span>
							<X className="transition-opacity opacity-0 group-hover:opacity-100" />
						</PermBadge>
					))}

					{unusedPerms.length !== 0 && (
						<Select onValueChange={(e) => handleAddPerm(e as Permission)}>
							<SelectTrigger className="outline-none" asChild>
								<PermBadge className="h-7 w-7 aspect-square" asChild>
									<Button variant="card" className="bg-primary/10" size={"sm"}>
										<Plus />
									</Button>
								</PermBadge>
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>Permissions</SelectLabel>

									{unusedPerms.map((p) => (
										<SelectItem value={p} key={p}>
											{p}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					)}
				</div>
				{editMode && (
					<div className="ms-auto flex gap-2">
						<Button variant="outline" size="sm" onClick={handleCancelEdit}>
							Cancel
						</Button>
						<Button size="sm">Save</Button>
					</div>
				)}
			</TableCell>
		</TableRow>
	);
}

function PermBadge({
	onClick,
	destructive = false,
	className,
	children,
	...props
}: React.PropsWithChildren<{ onClick?: () => void; destructive?: boolean }> &
	React.ComponentProps<typeof Badge>) {
	return (
		<Badge
			variant="outline"
			onClick={onClick}
			className={cn(
				"font-medium py-1 px-1 text-sm/1 transition-colors flex gap-2",
				"[&>svg]:size-4 hover:cursor-pointer",
				destructive &&
					"hover:bg-destructive hover:text-destructive-foreground hover:border-destructive",
				className,
			)}
			{...props}
		>
			{children}
		</Badge>
	);
}
