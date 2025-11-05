import { createFileRoute, redirect } from "@tanstack/react-router";
import { Search } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { debounce } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/admin/user")({
	component: Admin,
	loader: async () => {
		const usersRes = await client.api.user.all.$get();
		handleUnauthorized(usersRes.status);
		const rolesRes = await client.api.role.all.$get();
		handleUnauthorized(rolesRes.status);

		const roles = (await rolesRes.json()).roles;
		const users = (await usersRes.json()).users;

		const rolesMap: { [key: number]: string } = {};

		for (const role of roles) {
			rolesMap[role.id] = role.name;
		}

		return {
			roles: roles,
			rolesMap: rolesMap,
			users: users,
		};
	},
});

function handleUnauthorized(status: number) {
	switch (status) {
		case 401:
			throw redirect({
				to: "/login",
			});
		case 403:
			alert("You don't have the permission to access this page.");
			throw redirect({
				to: "/",
			});
	}
}

function Admin() {
	const { users: allUsers, roles } = Route.useLoaderData();
	const [users, setUsers] = useState(allUsers);
	const debounced = useCallback(
		debounce((query: string) => handleFilter(query), 300),
		[],
	);

	const handleRoleChange = async (userId: number, roleId: number) => {
		const res = await client.api.user[":id"].$post({
			param: { id: userId.toString() },
			json: { role: roleId },
		});
		return res.status === 200;
	};

	const handleFilter = (query: string) => {
		query = query.toLowerCase().trim();
		if (query === "") {
			setUsers(allUsers);
			return;
		}
		const filtered = allUsers.filter(
			(user) =>
				user.name.toLowerCase().includes(query) ||
				user.username.toLowerCase().includes(query),
		);
		setUsers(filtered);
	};

	return (
		<div className="flex flex-col gap-3 lg:w-3/4">
			<div className="flex flex-wrap items-start gap-4 justify-between">
				<h1 className="font-bold text-2xl">User Management</h1>
				<InputGroup className="w-80">
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput
						type="search"
						placeholder="Search by name or username"
						onChange={(e) => debounced(e.target.value)}
					/>
				</InputGroup>
			</div>
			<Table>
				<TableHeader>
					<RowItem name="Name" username="Username" header>
						Role
					</RowItem>
				</TableHeader>
				<TableBody>
					{users.map((user) => (
						<RowItem
							key={user.username}
							name={user.name}
							username={user.username}
						>
							<RoleSelect
								role={user.role.toString()}
								roles={roles}
								setRole={(id) => handleRoleChange(user.id, id)}
							/>
						</RowItem>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function RoleSelect({
	role,
	roles,
	setRole,
}: {
	role: string;
	roles: typeof Route.types.loaderData.roles;
	setRole: (roleId: number) => Promise<boolean>;
}) {
	const [roleId, setRoleId] = useState(role);
	const [eagerRoleId, setEagerRoleId] = useState(role);

	const handleSetRole = async (newRoleId: string) => {
		setEagerRoleId(newRoleId);
		const success = await setRole(Number(newRoleId));
		if (success) {
			setRoleId(newRoleId);
		} else {
			// change this to some toast thing in the future
			setEagerRoleId(roleId);
			alert("Failed to update role");
		}
	};

	return (
		<div className="flex gap-2">
			<Select value={eagerRoleId} onValueChange={handleSetRole}>
				<SelectTrigger size="sm" className="w-full focus-visible:ring-0">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{roles.map((r) => (
						<SelectItem key={r.id} value={r.id.toString()}>
							{r.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

function RowItem({
	name,
	username,
	children,
	header = false,
}: React.PropsWithChildren<{
	header?: boolean;
	name: string;
	username: string;
}>) {
	return (
		<TableRow>
			<TableCell className="w-2/5 whitespace-break-spaces">{name}</TableCell>
			<TableCell className={`w-2/5 ${header ? "" : "font-mono"}`}>
				{username}
			</TableCell>
			<TableCell className="w-1/5">{children}</TableCell>
		</TableRow>
	);
}
