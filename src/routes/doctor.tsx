import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import { useState } from "react";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
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
import { client } from "./api/$";

export const Route = createFileRoute("/doctor")({
	loader: async () => {
		const queueRes = await client.api.doctor.queue.$get();
		const queue = await handleErrors(queueRes);
		if (!queue) {
			return { queue: [] };
		}
		return { queue };
	},
	component: DoctorDashboard,
	staticData: {
		requiredPermissions: ["doctor"],
		icon: Stethoscope,
		name: "Doctor Dashboard",
	},
});

function DoctorDashboard() {
	useAuth(["doctor"]);
	const { queue: initialQueue } = Route.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = async () => {
		setIsRefreshing(true);
		await router.invalidate();
		setIsRefreshing(false);
	};

	const handleRowClick = (caseId: number) => {
		navigate({
			to: "/consultation/$id",
			params: { id: caseId.toString() },
		});
	};

	return (
		<>
			<TopBar title="Doctor Dashboard" />
			<div className="container mx-auto p-6">
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Doctor Dashboard</h1>
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
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<Stethoscope />
									</EmptyMedia>
									<EmptyTitle>No patients in queue</EmptyTitle>
									<EmptyContent>
										When patients are assigned to you, they will appear here.
									</EmptyContent>
								</EmptyHeader>
							</Empty>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Case ID</TableHead>
										<TableHead>Patient Name</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{initialQueue.map((item) => (
										<TableRow
											key={item.caseId}
											onClick={() => handleRowClick(item.caseId)}
											className="cursor-pointer"
										>
											<TableCell>{item.caseId}</TableCell>
											<TableCell>{item.patientName}</TableCell>
											<TableCell>{item.status}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</>
	);
}
