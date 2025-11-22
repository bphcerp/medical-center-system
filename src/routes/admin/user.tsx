import { createFileRoute } from "@tanstack/react-router";
import { Search, ShieldUser } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
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
import { handleErrors } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/admin/user")({
	component: Admin,
	loader: async () => {
		const usersRes = await client.api.user.all.$get();
		const rolesRes = await client.api.role.all.$get();
		const users = await handleErrors(usersRes);
		const roles = await handleErrors(rolesRes);
		if (!users || !roles) {
			return { roles: [], rolesMap: {}, users: [] };
		}

		const rolesMap: { [key: number]: string } = {};
		for (const role of roles) {
			rolesMap[role.id] = role.name;
		}
		return { roles, rolesMap, users };
	},
	staticData: {
		icon: ShieldUser,
		name: "User Management",
	},
});

function Admin() {
	useAuth(["admin"]);
	const { users: allUsers, roles } = Route.useLoaderData();
	const [users, setUsers] = useState(allUsers);

	const handleRoleChange = async (userId: number, roleId: number) => {
		const res = await client.api.user[":id"].$post({
			param: { id: userId.toString() },
			json: { role: roleId },
		});
		const data = await handleErrors(res);
		if (!data) {
			return false;
		}
		return true;
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
		<>
			<div className="flex flex-wrap items-center gap-4 justify-between mb-3">
				<h1 className="font-bold text-2xl">User Management</h1>
				<div className="flex gap-4 items-center">
					<InputGroup className="w-80">
						<InputGroupAddon>
							<Search />
						</InputGroupAddon>
						<InputGroupInput
							type="search"
							placeholder="Search by name or username"
							onChange={(e) => handleFilter(e.target.value)}
						/>
					</InputGroup>
				</div>
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-2/5 whitespace-break-spaces">
							Name
						</TableHead>
						<TableHead className="w-2/5">Username</TableHead>
						<TableHead className="w-1/5">Role</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{users.map((user) => (
						<TableRow key={user.username}>
							<TableCell className="whitespace-break-spaces">
								{user.name}
							</TableCell>
							<TableCell className="font-mono">{user.username}</TableCell>
							<TableCell>
								<RoleSelect
									role={user.role.toString()}
									roles={roles}
									setRole={(id) => handleRoleChange(user.id, id)}
								/>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</>
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
			toast.error("Failed to update role");
		}
	};

	return (
		<div className="flex gap-2">
			<Select value={eagerRoleId} onValueChange={handleSetRole}>
				<SelectTrigger size="sm" className="w-full focus-visible:ring-0">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectLabel>Roles</SelectLabel>
						{roles.map((r) => (
							<SelectItem key={r.id} value={r.id.toString()}>
								{r.name}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}
