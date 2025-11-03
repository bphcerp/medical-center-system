import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
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
import { client } from "./api/$";

export const Route = createFileRoute("/admin")({
	component: Admin,
	loader: async () => {
		const usersRes = await client.api.user.all.$get();
		handleUnauthorized(usersRes.status);
		const rolesRes = await client.api.role.all.$get();
		handleUnauthorized(rolesRes.status);

		const rolesJson = (await rolesRes.json()).roles;
		const usersJson = (await usersRes.json()).users;

		const rolesMap: { [key: number]: string } = {};

		for (const role of rolesJson) {
			rolesMap[role.id] = role.name;
		}

		return {
			roles: rolesJson,
			rolesMap: rolesMap,
			users: usersJson,
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
	const { users, roles } = Route.useLoaderData();

	const handleRoleChange = async (userId: number, roleId: number) => {
		const res = await client.api.user[":id"].$post({
			param: { id: userId.toString() },
			json: { role: roleId },
		});
		return res.status === 200;
	};

	return (
		<div className="flex justify-center w-full">
			<div className="w-2/3 m-10 flex flex-col gap-8">
				<h1 className="font-bold text-4xl">Role Management</h1>
				<div className="rounded-md border overflow-clip">
					<Table>
						<TableHeader className="">
							<RowItem name="Name" username="Username" roleNode="Role" header />
						</TableHeader>
						<TableBody>
							{users.map((user) => (
								<RowItem
									key={user.username}
									name={user.name}
									username={user.username}
									roleNode={
										<RoleSelect
											role={user.role.toString()}
											roles={roles}
											setRole={(id) => handleRoleChange(user.id, id)}
										/>
									}
								/>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
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

	const handleSetRole = async (newRoleId: string) => {
		const success = await setRole(Number(newRoleId));
		if (success) {
			setRoleId(newRoleId);
		} else {
			// change this to some toast thing in the future
			alert("Failed to update role");
		}
	};

	return (
		<div className="flex gap-2">
			<Select value={roleId} onValueChange={handleSetRole}>
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
	roleNode,
	header = false,
}: {
	header?: boolean;
	name: string;
	username: string;
	roleNode: React.ReactNode;
}) {
	return (
		<TableRow className={"flex items-center"}>
			<TableCell className="whitespace-break-spaces flex-2">{name}</TableCell>
			<TableCell className={`flex-2 ${header ? "" : "font-mono"}`}>
				{username}
			</TableCell>
			<TableCell className="flex-1">{roleNode}</TableCell>
		</TableRow>
	);
}
