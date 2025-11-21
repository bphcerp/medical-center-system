import { createFileRoute, redirect } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import TopBar from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import useAuth from "@/lib/hooks/useAuth";
import { client } from "../api/$";

export const Route = createFileRoute("/admin/otp-overrides")({
	loader: async () => {
		const logsRes = await client.api.admin["otp-override-logs"].$get();
		if (logsRes.status === 403) {
			alert("You don't have permission to access this page.");
			throw redirect({
				to: "/",
			});
		}
		if (logsRes.status !== 200) {
			throw new Error("Failed to fetch override logs");
		}

		const { logs } = await logsRes.json();

		return {
			logs,
		};
	},
	component: OTPOverridesPage,
	staticData: {
		requiredPermissions: ["admin"],
		icon: ShieldAlert,
		name: "OTP Override Logs",
	},
});

function OTPOverridesPage() {
	useAuth(["admin"]);
	const { logs } = Route.useLoaderData();

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleString("en-GB", {
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<>
			<TopBar title="OTP Override Logs" />
			<div className="container mx-auto p-6">
				<div className="mb-6">
					<h1 className="text-3xl font-bold">OTP Override Audit Logs</h1>
					<p className="text-muted-foreground mt-2">
						Review all instances where doctors bypassed OTP verification to
						access patient history.
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Override History ({logs.length} total)</CardTitle>
					</CardHeader>
					<CardContent>
						{logs.length === 0 ? (
							<div className="text-center py-8">
								<p className="text-muted-foreground">
									No override logs found. All access has been through proper OTP
									verification.
								</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date & Time</TableHead>
											<TableHead>Doctor</TableHead>
											<TableHead>Case ID</TableHead>
											<TableHead>Patient</TableHead>
											<TableHead>Reason</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{logs.map((log) => (
											<TableRow key={log.id}>
												<TableCell className="whitespace-nowrap">
													{formatDate(log.createdAt)}
												</TableCell>
												<TableCell>
													<div>
														<div className="font-medium">{log.doctorName}</div>
														<div className="text-sm text-muted-foreground">
															@{log.doctorUsername}
														</div>
													</div>
												</TableCell>
												<TableCell>{log.caseId}</TableCell>
												<TableCell>
													<div>
														<div className="font-medium">{log.patientName}</div>
														<div className="text-sm text-muted-foreground">
															ID: {log.patientId}
														</div>
													</div>
												</TableCell>
												<TableCell className="max-w-md">
													<div className="text-sm">{log.reason}</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</>
	);
}
