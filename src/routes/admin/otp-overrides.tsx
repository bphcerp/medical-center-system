import { createFileRoute } from "@tanstack/react-router";
import { ScrollText, ShieldCheck } from "lucide-react";
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
import { client } from "../api/$";

export const Route = createFileRoute("/admin/otp-overrides")({
	loader: async () => {
		const logsRes = await client.api.admin["otp-override-logs"].$get();
		const logs = await handleErrors(logsRes);
		if (!logs) {
			return { logs: [] };
		}
		return { logs };
	},
	component: OTPOverridesPage,
	staticData: {
		icon: ScrollText,
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
			<div className="mb-6">
				<h1 className="text-3xl font-bold">OTP Override Audit Logs</h1>
				<p className="text-muted-foreground mt-2">
					Review all instances where doctors bypassed OTP verification to access
					patient history.
				</p>
			</div>
			{logs.length === 0 ? (
				<Empty className="mt-36">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<ShieldCheck />
						</EmptyMedia>
						<EmptyTitle>No OTP override logs found</EmptyTitle>
						<EmptyContent>
							All access has been through proper OTP verification.
						</EmptyContent>
					</EmptyHeader>
				</Empty>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>Override History ({logs.length} total)</CardTitle>
					</CardHeader>
					<CardContent>
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
					</CardContent>
				</Card>
			)}
		</>
	);
}
