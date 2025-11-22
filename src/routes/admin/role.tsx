import { SelectTrigger } from "@radix-ui/react-select";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeftRight, Pencil, Plus, Trash, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import useAuth from "@/lib/hooks/useAuth";
import {
	type Permission,
	permissionDescriptions,
	permissions,
} from "@/lib/types/permissions";
import { cn, handleErrors } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/admin/role")({
	component: RolePage,
	loader: async () => {
		const res = await client.api.role.all.$get();
		const data = await handleErrors(res);
		return { roles: data ?? [] };
	},
});

function RolePage() {
	useAuth(["admin"]);
	const { roles } = Route.useLoaderData();
	const router = useRouter();

	const handleUpdateRole = async (
		id: number,
		name: string,
		perms: Permission[],
	) => {
		const res = await client.api.role[":id"].$post({
			param: { id: id.toString() },
			json: { name: name, allowed: perms },
		});
		const data = await handleErrors(res);
		if (!data) {
			return;
		}

		router.invalidate();
	};

	const handleDeleteRole = async (id: number) => {
		const res = await client.api.role[":id"].$delete({
			param: { id: id.toString() },
		});
		const data = await handleErrors(res);
		if (!data) {
			return;
		}
		router.invalidate();
	};

	const handleCreateRole = async (name: string) => {
		const res = await client.api.role.$post({
			json: {
				name: name,
				allowed: [],
			},
		});
		const data = await handleErrors(res);
		if (!data) {
			return;
		}
		router.invalidate();
	};

	return (
		<>
			<div className="flex items-center justify-between">
				<span className="flex gap-4 items-center">
					<h1 className="text-2xl font-bold inline">Role Management</h1>
					<CreateRoleButton onCreate={handleCreateRole} />
				</span>
				<Link to="/admin/user">
					<Button variant="link" className="p-0">
						<ArrowLeftRight /> Manage users
					</Button>
				</Link>
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-0 p-0" />
						<TableHead className="w-1/4">Role</TableHead>
						<TableHead className="w-0 p-0" />
						<TableHead className="pl-2">Permissions</TableHead>
						<TableHead className="w-0 p-0" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{roles.map((role) => (
						<RowItem
							key={role.id}
							name={role.name}
							perms={role.allowed as Permission[]}
							onUpdateRole={(name, perms) =>
								handleUpdateRole(role.id, name, perms)
							}
							onDeleteRole={() => handleDeleteRole(role.id)}
						/>
					))}
				</TableBody>
			</Table>
		</>
	);
}

function CreateRoleButton({
	onCreate,
}: {
	onCreate: (name: string) => Promise<void>;
}) {
	const [isOpen, setIsOpen] = useState(false);

	const handleSubmit = async (e: FormData) => {
		const name = e.get("roleName");
		if (name === null) return;

		await onCreate(name as string);
		setIsOpen(false);
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="card" className="border-primary text-primary">
					<Plus /> Create
				</Button>
			</DialogTrigger>
			<DialogContent showCloseButton={false} className="gap-2">
				<DialogTitle>Create new role</DialogTitle>
				<DialogDescription>
					You'll be able to assign permissions later.
				</DialogDescription>
				<form action={handleSubmit}>
					<Input
						type="text"
						name="roleName"
						placeholder="Role name"
						className="mb-4"
						autoFocus
					/>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>

						<Button type="submit">Create</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function RowItem({
	name,
	onDeleteRole,
	onUpdateRole,
	perms: originalPerms,
}: {
	name: string;
	perms: Permission[];
	onUpdateRole: (name: string, perms: Permission[]) => Promise<void>;
	onDeleteRole: () => Promise<void>;
}) {
	const [perms, setPerms] = useState(originalPerms);
	const [unusedPerms, setUnusedPerms] = useState(() =>
		permissions.filter((p) => !originalPerms.includes(p)),
	);

	const handleDeletePerm = (perm: Permission) => {
		const newPerms = perms.filter((p) => p !== perm);
		setPerms(newPerms);
		// sort perms so they remain in the same place if and when re-adding
		setUnusedPerms((prev) => [...prev, perm].sort());

		onUpdateRole(name, newPerms);
	};

	const handleAddPerm = (perm: Permission) => {
		const newPerms = [perm, ...perms];
		setPerms(newPerms);
		setUnusedPerms((prev) => prev.filter((p) => p !== perm));

		onUpdateRole(name, newPerms);
	};

	const handleRename = async (newName: string) => {
		await onUpdateRole(newName, perms);
	};

	return (
		<TableRow>
			<TableCell className="pr-0">
				<RenameButton name={name} onRename={handleRename} />
			</TableCell>

			<TableCell>{name}</TableCell>

			<TableCell className="flex gap-6 px-0">
				<Select
					onValueChange={(e) => handleAddPerm(e as Permission)}
					defaultValue=""
					disabled={unusedPerms.length === 0}
				>
					<SelectTrigger className="outline-none" asChild>
						<CircleButton className="bg-primary/20 text-secondary">
							<Plus />
						</CircleButton>
					</SelectTrigger>

					<SelectContent align="start" className="max-w-80">
						<SelectGroup>
							<SelectLabel>Permissions</SelectLabel>

							{unusedPerms.map((p) => (
								<SelectItem value={p} key={p}>
									<div className="flex flex-col">
										<span className="font-medium">{p}</span>
										<span className="text-muted-foreground text-xs">
											{permissionDescriptions[p]}
										</span>
									</div>
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</TableCell>

			<TableCell className="pl-2">
				<div className="flex flex-1 flex-wrap gap-2 items-center">
					{perms.map((perm) => (
						<PermBadge
							key={perm}
							onClick={() => handleDeletePerm(perm)}
							className="group"
						>
							<span className="translate-x-3 group-hover:translate-x-1 transition-transform">
								{perm}
							</span>
							<X className="transition-opacity opacity-0 group-hover:opacity-100" />
						</PermBadge>
					))}
				</div>
			</TableCell>
			<TableCell>
				<DeleteButton name={name} onDelete={onDeleteRole} />
			</TableCell>
		</TableRow>
	);
}

function DeleteButton({
	name,
	onDelete,
}: {
	name: string;
	onDelete: () => Promise<void>;
}) {
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);

	const handleDelete = async () => {
		await onDelete();
		setIsDeleteOpen(false);
	};

	return (
		<Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
			<DialogTrigger asChild>
				<CircleButton className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive">
					<Trash />
				</CircleButton>
			</DialogTrigger>

			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete role "{name}"</DialogTitle>
				</DialogHeader>

				<DialogDescription>
					Are you sure you want to delete this role? This action cannot be
					undone.
				</DialogDescription>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button variant="destructive" onClick={handleDelete}>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function RenameButton({
	name,
	onRename,
}: {
	name: string;
	onRename: (name: string) => Promise<void>;
}) {
	const [isRenameOpen, setIsRenameOpen] = useState(false);

	const handleRename = async (e: FormData) => {
		const name = e.get("roleName");
		if (name === null) return;

		await onRename(name as string);
		setIsRenameOpen(false);
	};

	return (
		<Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
			<DialogTrigger asChild>
				<CircleButton>
					<Pencil className="size-3.5" />
				</CircleButton>
			</DialogTrigger>
			<DialogContent showCloseButton={false} className="gap-4">
				<DialogTitle>Rename role "{name}"</DialogTitle>
				<form action={handleRename}>
					<Input
						type="text"
						name="roleName"
						placeholder="Role name"
						className="mb-4"
						autoFocus
					/>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>

						<Button type="submit">Rename</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function PermBadge({
	onClick,
	className,
	children,
	...props
}: React.PropsWithChildren<{ onClick?: () => void }> &
	React.ComponentProps<typeof Badge>) {
	return (
		<Badge
			variant="outline"
			onClick={onClick}
			className={cn(
				"font-medium py-1 px-1 text-sm/1 transition-colors flex gap-2 select-none",
				"[&>svg]:size-4 hover:cursor-pointer",
				"hover:bg-destructive hover:text-destructive-foreground hover:border-destructive",
				className,
			)}
			{...props}
		>
			{children}
		</Badge>
	);
}

function CircleButton({
	children,
	className,
	...props
}: React.ComponentProps<typeof Button>) {
	return (
		<Button
			variant="card"
			className={cn("h-7 w-7 disabled:bg-transparent rounded-full", className)}
			size="sm"
			{...props}
		>
			{children}
		</Button>
	);
}
