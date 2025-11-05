import { createFileRoute } from "@tanstack/react-router";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { handleUnauthorized } from "@/lib/utils";
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
					<TableRow className="*:w-1/2">
						<TableCell>Role</TableCell>
						<TableCell>Permissions</TableCell>
					</TableRow>
				</TableHeader>
				<TableBody>
					{roles.map((role) => (
						<RowItem key={role.id} role={role} />
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function RowItem({
	role,
}: {
	role: (typeof Route.types.loaderData.roles)[number];
}) {
	return (
		<TableRow>
			<TableCell>{role.name}</TableCell>
			<TableCell>{role.allowed.join(", ")}</TableCell>
		</TableRow>
	);
}
