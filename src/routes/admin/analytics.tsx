import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ChartData } from "chart.js";
import { ChartBar } from "lucide-react";
import { useEffect, useState } from "react";
import z from "zod";
import BarChart from "@/components/charts/BarChart";
import LineChart from "@/components/charts/LineChart";
import PieChart from "@/components/charts/PieChart";
import "@/components/charts/config";
import { chartColors } from "@/components/charts/colors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import useAuth from "@/lib/hooks/useAuth";
import { handleErrors } from "@/lib/utils";
import { client } from "../api/$";

const DAY_OPTIONS = [7, 14, 30, 90] as const;
const TOP_N_OPTIONS = [5, 10, 20, 50] as const;

const DISPOSITION_COLORS: Record<
	string,
	(typeof chartColors)[keyof typeof chartColors]
> = {
	opd: chartColors.blue,
	admitted: chartColors.red,
	referred: chartColors.yellow,
	"in-progress": chartColors.grey,
};

const DISPOSITION_LABELS: Record<string, string> = {
	opd: "OPD",
	admitted: "Admitted",
	referred: "Referred",
	"in-progress": "In Progress",
};

const PATIENT_TYPE_COLORS: Record<
	string,
	(typeof chartColors)[keyof typeof chartColors]
> = {
	student: chartColors.blue,
	professor: chartColors.purple,
	dependent: chartColors.orange,
	visitor: chartColors.grey,
};

function generateDateRange(days: number): string[] {
	const dates: string[] = [];
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
		dates.push(d.toISOString().split("T")[0]);
	}
	return dates;
}

export const Route = createFileRoute("/admin/analytics")({
	validateSearch: z.object({
		days: z.coerce.number().int().min(1).max(365).catch(30),
		topDiagnoses: z.coerce.number().int().min(1).max(100).catch(10),
		topMedicines: z.coerce.number().int().min(1).max(100).catch(10),
	}),
	loaderDeps: ({ search }) => ({
		days: search.days,
		topDiagnoses: search.topDiagnoses,
		topMedicines: search.topMedicines,
	}),
	loader: async ({ deps }) => {
		const res = await client.api.admin.analytics.$get({
			query: {
				days: String(deps.days),
				topDiagnoses: String(deps.topDiagnoses),
				topMedicines: String(deps.topMedicines),
			},
		});
		const data = await handleErrors(res);
		return (
			data ?? {
				topDiagnoses: [],
				topMedicines: [],
				casesOverTime: [],
				caseDispositions: [],
				patientTypeDist: [],
			}
		);
	},
	component: AnalyticsPage,
	staticData: {
		icon: ChartBar,
		name: "Analytics",
	},
});

function ChartSkeleton() {
	return <Skeleton className="h-64 w-full rounded-lg" />;
}

function AnalyticsPage() {
	useAuth(["admin"]);

	const data = Route.useLoaderData();
	const { days, topDiagnoses, topMedicines } = Route.useSearch();
	const navigate = useNavigate({ from: "/admin/analytics" });
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const allDates = generateDateRange(days);

	// gaps filled with zeros
	const casesTimeData: ChartData<"line"> = {
		labels: allDates,
		datasets: [
			{
				label: "Cases",
				data: allDates.map(
					(d) =>
						(data.casesOverTime as Array<{ date: string; count: number }>).find(
							(c) => c.date === d,
						)?.count ?? 0,
				),
				backgroundColor: chartColors.blue.background,
				borderColor: chartColors.blue.border,
			},
		],
	};

	const diagnosisData: ChartData<"bar"> = {
		labels: (
			data.topDiagnoses as Array<{ name: string; icd: string; count: number }>
		).map((d) => d.name),
		datasets: [
			{
				label: "Cases",
				data: (
					data.topDiagnoses as Array<{
						name: string;
						icd: string;
						count: number;
					}>
				).map((d) => d.count),
				backgroundColor: chartColors.blue.background,
				borderColor: chartColors.blue.border,
			},
		],
	};

	const medicinesData: ChartData<"bar"> = {
		labels: (
			data.topMedicines as Array<{ name: string; brand: string; count: number }>
		).map((m) => `${m.name} (${m.brand})`),
		datasets: [
			{
				label: "Prescriptions",
				data: (
					data.topMedicines as Array<{
						name: string;
						brand: string;
						count: number;
					}>
				).map((m) => m.count),
				backgroundColor: chartColors.green.background,
				borderColor: chartColors.green.border,
			},
		],
	};

	const dispositions = (
		data.caseDispositions as Array<{ state: string | null; count: number }>
	).map((d) => ({
		key: d.state ?? "in-progress",
		count: d.count,
	}));
	const dispositionData: ChartData<"pie"> = {
		labels: dispositions.map((d) => DISPOSITION_LABELS[d.key] ?? d.key),
		datasets: [
			{
				data: dispositions.map((d) => d.count),
				backgroundColor: dispositions.map(
					(d) => (DISPOSITION_COLORS[d.key] ?? chartColors.grey).background,
				),
				borderColor: dispositions.map(
					(d) => (DISPOSITION_COLORS[d.key] ?? chartColors.grey).border,
				),
			},
		],
	};

	const patientTypes = data.patientTypeDist as Array<{
		type: string;
		count: number;
	}>;
	const patientData: ChartData<"pie"> = {
		labels: patientTypes.map((p) => p.type),
		datasets: [
			{
				data: patientTypes.map((p) => p.count),
				backgroundColor: patientTypes.map(
					(p) => (PATIENT_TYPE_COLORS[p.type] ?? chartColors.grey).background,
				),
				borderColor: patientTypes.map(
					(p) => (PATIENT_TYPE_COLORS[p.type] ?? chartColors.grey).border,
				),
			},
		],
	};

	return (
		<>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold">Analytics</h1>
					<p className="text-muted-foreground mt-2">
						Clinical and operational insights across the medical center.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">Last</span>
					{DAY_OPTIONS.map((d) => (
						<Button
							key={d}
							size="sm"
							variant={days === d ? "default" : "outline"}
							onClick={() =>
								navigate({ search: (prev) => ({ ...prev, days: d }) })
							}
						>
							{d}d
						</Button>
					))}
				</div>
			</div>

			<div className="flex min-w-0 flex-col gap-6">
				{/* Cases over time — full width */}
				<Card className="min-w-0">
					<CardHeader>
						<CardTitle>Cases Over Time</CardTitle>
					</CardHeader>
					<CardContent className="min-w-0">
						{mounted ? (
							<LineChart data={casesTimeData} smooth fill />
						) : (
							<ChartSkeleton />
						)}
					</CardContent>
				</Card>

				<div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
					<Card className="min-w-0">
						<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<CardTitle>Top Diagnoses</CardTitle>
							<div className="flex items-center gap-1">
								<span className="text-xs text-muted-foreground mr-1">Top</span>
								{TOP_N_OPTIONS.map((n) => (
									<Button
										key={n}
										size="sm"
										variant={topDiagnoses === n ? "default" : "outline"}
										onClick={() =>
											navigate({
												search: (prev) => ({ ...prev, topDiagnoses: n }),
											})
										}
									>
										{n}
									</Button>
								))}
							</div>
						</CardHeader>
						<CardContent className="min-w-0">
							{mounted ? (
								diagnosisData.labels?.length ? (
									<BarChart data={diagnosisData} horizontal />
								) : (
									<p className="text-sm text-muted-foreground py-8 text-center">
										No diagnosis data for this period.
									</p>
								)
							) : (
								<ChartSkeleton />
							)}
						</CardContent>
					</Card>

					<Card className="min-w-0">
						<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<CardTitle>Most Prescribed Medicines</CardTitle>
							<div className="flex items-center gap-1">
								<span className="text-xs text-muted-foreground mr-1">Top</span>
								{TOP_N_OPTIONS.map((n) => (
									<Button
										key={n}
										size="sm"
										variant={topMedicines === n ? "default" : "outline"}
										onClick={() =>
											navigate({
												search: (prev) => ({ ...prev, topMedicines: n }),
											})
										}
									>
										{n}
									</Button>
								))}
							</div>
						</CardHeader>
						<CardContent className="min-w-0">
							{mounted ? (
								medicinesData.labels?.length ? (
									<BarChart data={medicinesData} horizontal />
								) : (
									<p className="text-sm text-muted-foreground py-8 text-center">
										No prescription data for this period.
									</p>
								)
							) : (
								<ChartSkeleton />
							)}
						</CardContent>
					</Card>
				</div>

				<div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
					<Card className="min-w-0">
						<CardHeader>
							<CardTitle>Case Disposition</CardTitle>
						</CardHeader>
						<CardContent className="flex min-w-0 justify-center">
							{mounted ? (
								dispositions.length ? (
									<div className="w-full max-w-72">
										<PieChart data={dispositionData} doughnut />
									</div>
								) : (
									<p className="text-sm text-muted-foreground py-8 text-center">
										No case data for this period.
									</p>
								)
							) : (
								<ChartSkeleton />
							)}
						</CardContent>
					</Card>

					<Card className="min-w-0">
						<CardHeader>
							<CardTitle>Patient Type Breakdown</CardTitle>
						</CardHeader>
						<CardContent className="flex min-w-0 justify-center">
							{mounted ? (
								patientTypes.length ? (
									<div className="w-full max-w-72">
										<PieChart data={patientData} doughnut />
									</div>
								) : (
									<p className="text-sm text-muted-foreground py-8 text-center">
										No patient data available.
									</p>
								)
							) : (
								<ChartSkeleton />
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</>
	);
}
