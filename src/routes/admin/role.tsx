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

	const handleSave = async (id: number, perms: Permission[]) => {
		const res = await client.api.role[":id"].$post({
			param: { id: id.toString() },
			json: { allowed: perms },
		});

		return res.status === 200;
	};

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
							onSave={(perms) => handleSave(role.id, perms)}
						/>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function RowItem({
	name,
	onSave,
	perms: originalPerms,
}: {
	name: string;
	perms: Permission[];
	onSave: (perms: Permission[]) => Promise<boolean>;
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
		setUnusedPerms(Permissions.filter((p) => !originalPerms.includes(p)));
	};

	const handleSaveEdit = async () => {
		const success = await onSave?.(perms);
		if (!success) {
			setPerms(originalPerms);
			setUnusedPerms(Permissions.filter((p) => !originalPerms.includes(p)));
			alert("Failed to update permissions");
		}
		setEditMode(false);
	};

	return (
		<TableRow>
			<TableCell>{name}</TableCell>

			<TableCell
				className={`flex transition-(--p) gap-6 pr-2 ${editMode ? "py-4" : ""}`}
			>
				<div
					className="flex flex-1 flex-wrap transition-all gap-2 items-center"
				>
					<Select
						onValueChange={(e) => handleAddPerm(e as Permission)}
						disabled={unusedPerms.length === 0}
					>
						<SelectTrigger className="outline-none" asChild>
							<PermBadge className="h-7 w-7 disabled:bg-transparent" asChild>
								<Button
									variant="card"
									className="bg-primary/20 text-secondary"
									size="sm"
								>
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

					{perms.map((perm) => (
						<PermBadge
							key={perm}
							onClick={() => handleDeletePerm(perm)}
							className="group"
							destructive
						>
							<span className="translate-x-3 group-hover:translate-x-1 transition-transform">
								{perm}
							</span>
							<X className="transition-opacity opacity-0 group-hover:opacity-100" />
						</PermBadge>
					))}
				</div>
				{editMode && (
					<div className="ms-auto flex gap-2">
						<Button variant="outline" size="sm" onClick={handleCancelEdit}>
							Cancel
						</Button>
						<Button size="sm" onClick={handleSaveEdit}>
							Save
						</Button>
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
				"font-medium py-1 px-1 text-sm/1 transition-colors flex gap-2 select-none",
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
