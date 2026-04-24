import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import TopBar from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Empty,
	EmptyDescription,
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
import { useSSE } from "@/lib/hooks/useSSE";
import { handleErrors, titleCase } from "@/lib/utils";
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
	const queue = useSSE("/api/doctor/stream", "queue", initialQueue);

	return (
		<>
			<TopBar title="Doctor Dashboard" />
			<div className="container mx-auto p-6">
				<div className="mb-6">
					<h1 className="text-3xl font-bold">Doctor Dashboard</h1>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>My Patient Queue</CardTitle>
					</CardHeader>
					<CardContent>
						{queue.length === 0 ? (
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<Stethoscope />
									</EmptyMedia>
									<EmptyTitle>No patients in queue</EmptyTitle>
									<EmptyDescription>
										When patients are assigned to you, they will appear here.
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Token</TableHead>
										<TableHead>Patient Name</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{queue.map((item) => {
										const consultationParams = {
											id: item.caseId.toString(),
										};

										return (
											<TableRow key={item.caseId} className="hover:bg-muted/50">
												<TableCell className="p-0">
													<Link
														to="/consultation/$id"
														params={consultationParams}
														className="block px-4 py-2 font-medium"
													>
														{item.token}
													</Link>
												</TableCell>
												<TableCell className="p-0">
													<Link
														to="/consultation/$id"
														params={consultationParams}
														className="block px-4 py-2"
													>
														<span className="flex flex-col">
															<span>{item.patientName}</span>
															<span className="text-sm text-muted-foreground">
																{titleCase(item.patientSex)}, {item.patientAge}{" "}
																y.o.
															</span>
														</span>
													</Link>
												</TableCell>
												<TableCell className="p-0">
													<Link
														to="/consultation/$id"
														params={consultationParams}
														className="block px-4 py-2"
													>
														{item.status}
													</Link>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</>
	);
}
