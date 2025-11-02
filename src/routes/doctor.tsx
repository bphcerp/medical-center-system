import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { client } from "./api/$";

export const Route = createFileRoute("/doctor")({
	loader: async () => {
		// Check if user is authenticated and has doctor permissions
		const res = await client.api.user.$get();
		if (res.status !== 200) {
			throw redirect({
				to: "/login",
			});
		}
		const user = await res.json();
		// ensure that the user object is valiod and not an error object
		if ("error" in user) {
			throw redirect({
				to: "/login",
			});
		}

		// Fetch the queue (this will fail if user doesn't have doctor permissions)
		const queueRes = await client.api.doctor.queue.$get();
		if (queueRes.status === 403) {
			// User doesn't have doctor permissions
			throw redirect({
				to: "/login",
			});
		}
		if (queueRes.status !== 200) {
			throw new Error("Failed to fetch queue");
		}
		const queueData = await queueRes.json();

		return { user, queue: queueData.queue };
	},
	component: DoctorDashboard,
});

function DoctorDashboard() {
	const { user, queue: initialQueue } = Route.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await router.invalidate();
		} finally {
			setIsRefreshing(false);
		}
	};

	const handleRowClick = (caseId: number) => {
		navigate({
			to: "/consultation/$id",
			params: { id: caseId.toString() },
		});
	};

	return (
		<div className="container mx-auto p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Doctor Dashboard</h1>
					<p className="text-muted-foreground mt-1">Welcome, Dr. {user.name}</p>
				</div>
				<Button onClick={handleRefresh} disabled={isRefreshing}>
					{isRefreshing ? "Refreshing..." : "Refresh"}
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>My Patient Queue</CardTitle>
				</CardHeader>
				<CardContent>
					{!initialQueue || initialQueue.length === 0 ? (
						<div className="text-center py-8">
							<p className="text-muted-foreground">No patients in queue</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="border-b">
										<th className="text-left py-3 px-4 font-semibold">
											Case ID
										</th>
										<th className="text-left py-3 px-4 font-semibold">
											Patient Name
										</th>
										<th className="text-left py-3 px-4 font-semibold">Status</th>
									</tr>
								</thead>
								<tbody>
									{initialQueue.map((item) => (
										<tr
											key={item.caseId}
											onClick={() => handleRowClick(item.caseId)}
											className="border-b hover:bg-accent cursor-pointer transition-colors"
										>
											<td className="py-3 px-4">{item.caseId}</td>
											<td className="py-3 px-4">{item.patientName}</td>
											<td className="py-3 px-4">{item.status}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
