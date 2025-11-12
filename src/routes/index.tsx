import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { client } from "./api/$";

export const Route = createFileRoute("/")({
	loader: async () => {
		const res = await client.api.user.$get();
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

		let check = { message: "You don't have the permission" };
		const perms = await client.api.rbac.$get();
		if (perms.status === 200) {
			check = await perms.json();
		}
		return { check, ...user };
	},
	component: App,
});

function App() {
	const user = Route.useLoaderData();
	const { flatRoutes, navigate } = useRouter();
	const allowedRoutes = flatRoutes.filter(
		(route) =>
			route.options.staticData?.requiredPermissions &&
			user.role.allowed.some((perm) =>
				route.options.staticData?.requiredPermissions?.includes(perm),
			),
	);

	if (allowedRoutes.length === 1) {
		navigate({ to: allowedRoutes[0].fullPath });
		return null;
	}

	const handleLogout = async () => {
		const res = await client.api.logout.$get();
		if (res.status === 200) {
			navigate({ to: "/login" });
			return;
		}
		alert("Failed to logout. Please try again.");
	};

	return (
		<div className="px-4">
			<div className="py-4 flex justify-between">
				<span className="text-lg">
					<span>Logged in as: </span>
					<span className="font-bold">
						{user.user.name} ({user.user.username})
					</span>
				</span>
				<Button className="ml-4" variant="secondary" onClick={handleLogout}>
					Logout
				</Button>
			</div>
			<h1 className="text-2xl font-bold mb-4">
				Welcome to the Medical Center System
			</h1>

			<div className="flex justify-center pt-8">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-8 justify-items-stretch w-2/3">
					{allowedRoutes.map((route) => (
						<Button
							key={route.path}
							variant="outline"
							onClick={() => {
								navigate({ to: route.fullPath });
							}}
							className="h-72 flex flex-col justify-center items-center gap-8"
						>
							{route.options.staticData?.icon && (
								<route.options.staticData.icon className="ml-2 size-24" />
							)}
							<span className="mt-4 text-lg font-semibold">
								{route.options.staticData?.name || route.path}
							</span>
						</Button>
					))}
				</div>
			</div>
		</div>
	);
}
