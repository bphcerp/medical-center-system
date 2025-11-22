import { createFileRoute, useRouter } from "@tanstack/react-router";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import useAuth from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/")({
	component: App,
});

function App() {
	const { navigate } = useRouter();
	const { allowedRoutes } = useAuth();

	if (allowedRoutes.length === 1) {
		navigate({ to: allowedRoutes[0].fullPath });
		return null;
	}

	return (
		<>
			<TopBar title="Medical Center System" />
			<div className="flex justify-center h-after-topbar">
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 justify-items-stretch xl:w-2/3 w-full px-6 mt-16 mb-auto">
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
							<span className="mt-4 text-lg text-wrap font-semibold">
								{route.options.staticData?.name || route.path}
							</span>
						</Button>
					))}
				</div>
			</div>
		</>
	);
}
