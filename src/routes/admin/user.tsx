import { createFileRoute } from "@tanstack/react-router";
import { FilterIcon, Search, ShieldUser } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
import { handleErrors, titleCase } from "@/lib/utils";
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
		name: "Manage Staff",
	},
});

type Filter = {
	name?: string;
	roleIds: Set<number>;
};

function Admin() {
	useAuth(["admin"]);
	const { users: allUsers, roles } = Route.useLoaderData();
	const [filter, setFilter] = useState<Filter>({ roleIds: new Set() });

	const users = useMemo(() => {
		let filtered = allUsers;

		if (filter.name) {
			const query = filter.name.toLowerCase();
			filtered = filtered.filter(
				(user) =>
					user.name.toLowerCase().includes(query) ||
					user.username.toLowerCase().includes(query),
			);
		}

		if (filter.roleIds.size > 0) {
			filtered = filtered.filter((user) => filter.roleIds.has(user.role));
		}

		return filtered;
	}, [allUsers, filter]);

	const handleRoleChange = async (userId: number, roleId: number) => {
		const res = await client.api.user[":id"].$post({
			param: { id: userId.toString() },
			json: { role: roleId },
		});
		const data = await handleErrors(res);
		return !!data;
	};

	return (
		<>
			<div className="flex flex-wrap items-center gap-4 justify-between mb-3">
				<h1 className="font-bold text-2xl">Manage Staff</h1>
				<div className="flex gap-4 items-center">
					<div className="flex">
						<InputGroup className="w-80">
							<InputGroupAddon>
								<Search />
							</InputGroupAddon>
							<InputGroupInput
								type="search"
								placeholder="Search by name or username"
								onChange={(e) =>
									setFilter((filter) => ({ ...filter, name: e.target.value }))
								}
							/>
						</InputGroup>
					</div>
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline">
								<FilterIcon /> Role
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="bg-background w-48">
							<RoleFilter
								roles={roles}
								selected={filter.roleIds}
								onChanged={(ids) =>
									setFilter((filter) => ({ ...filter, roleIds: ids }))
								}
							/>
						</PopoverContent>
					</Popover>
				</div>
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-1/5 whitespace-break-spaces">
							Member
						</TableHead>
						<TableHead className="w-3/5" />
						<TableHead className="w-1/5">Role</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{users.map((user) => (
						<TableRow key={user.username}>
							<TableCell className="whitespace-break-spaces flex flex-col">
								<span className="font-medium text-base">{user.name}</span>
								<span className="text-muted-foreground text-xs">
									{user.username}
								</span>
							</TableCell>
							<TableCell>
								<div className="flex flex-col">
									{user.speciality && (
										<span className="italic text-base">
											{user.speciality.name}
										</span>
									)}
									{user.doctor && (
										<span className="text-muted-foreground">
											{titleCase(user.doctor.availabilityType)}
										</span>
									)}
								</div>
							</TableCell>
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

function RoleFilter({
	roles,
	selected,
	onChanged,
}: {
	roles: typeof Route.types.loaderData.roles;
	selected: Set<number>;
	onChanged: (selected: Set<number>) => void;
}) {
	return (
		<FieldSet>
			<FieldLegend>Filter by Role</FieldLegend>
			<FieldGroup className="gap-3">
				{roles.map((role) => (
					<Field
						key={role.id}
						orientation="horizontal"
						className="*:cursor-pointer"
					>
						<Checkbox
							checked={selected.has(role.id)}
							id={`role-${role.id}`}
							className="border-2 size-5"
							onCheckedChange={(e) => {
								const newSet = new Set(selected);
								if (e) {
									newSet.add(role.id);
								} else {
									newSet.delete(role.id);
								}
								onChanged(newSet);
							}}
						/>
						<FieldLabel htmlFor={`role-${role.id}`} className="font-normal">
							{role.name}
						</FieldLabel>
					</Field>
				))}
			</FieldGroup>
		</FieldSet>
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
