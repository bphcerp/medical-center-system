import type { InferResponseType } from "hono/client";
import type React from "react";
import { cn } from "src/lib/utils";
import { client } from "@/routes/api/$";
import VitalField from "./vital-field";

const caseDetailsResponse =
	client.api.patientHistory.otp[":caseId"].verify.$post;
export type CaseDetail = InferResponseType<typeof caseDetailsResponse, 200>;

const VitalsList = ({
	vitals,
	condensed = false,
	className,
}: React.ComponentProps<"div"> & {
	vitals?: CaseDetail["data"]["caseDetail"]["cases"];
	condensed?: boolean;
}) => {
	const metricMeta = {
		bodyTemperature: { label: "Body Temperature", unit: "° F" },
		heartRate: { label: "Heart Rate", unit: "bpm" },
		respiratoryRate: { label: "Respiratory Rate", unit: "per min" },
		spo2: { label: "SpO2", unit: "%" },
		bloodPressureSystolic: {
			label: "Blood Pressure (Systolic)",
			unit: "mmHg",
		},
		bloodPressureDiastolic: {
			label: "Blood Pressure (Diastolic)",
			unit: "mmHg",
		},
		weight: { label: "Weight", unit: "kg" },
		bloodSugar: { label: "Blood Sugar", unit: "mg/dL" },
	} as const;

	type MetricKey = keyof typeof metricMeta;

	const metricValues: Record<MetricKey, string | number | null | undefined> = {
		bodyTemperature: vitals?.temperature,
		heartRate: vitals?.heartRate,
		respiratoryRate: vitals?.respiratoryRate,
		spo2: vitals?.spo2,
		bloodPressureSystolic: vitals?.bloodPressureSystolic,
		bloodPressureDiastolic: vitals?.bloodPressureDiastolic,
		weight: vitals?.weight,
		bloodSugar: vitals?.bloodSugar,
	};

	const formatValue = (
		value: string | number | null | undefined,
		unit?: string,
	) => {
		if (value === null || value === undefined || value === "") {
			return "—";
		}
		return unit ? `${value} ${unit}` : String(value);
	};

	const formatBloodPressure = (
		systolic: string | number | null | undefined,
		diastolic: string | number | null | undefined,
	) => {
		if (!systolic && !diastolic) {
			return "—";
		}

		return `${systolic ?? "—"}/${diastolic ?? "—"} mmHg`;
	};

	const metricKeys = Object.keys(metricMeta) as MetricKey[];

	const fullVitals = metricKeys.map((key) => ({
		name: key,
		label: metricMeta[key].label,
		unit: metricMeta[key].unit,
		placeholder: metricMeta[key].label,
		value: metricValues[key],
	}));

	const getCondensedUnit = (unit: string) => {
		if (unit === "° F") {
			return "°F";
		}
		return unit;
	};

	type CondensedKey = MetricKey | "bloodPressure";

	const condensedKeys = metricKeys.reduce<CondensedKey[]>((acc, key) => {
		if (key === "bloodPressureSystolic") {
			acc.push("bloodPressure");
			return acc;
		}

		if (key === "bloodPressureDiastolic") {
			return acc;
		}

		acc.push(key);
		return acc;
	}, []);

	const condensedVitalsDisplay = condensedKeys.map((key) => {
		if (key === "bloodPressure") {
			return {
				label: "Blood Pressure",
				value: formatBloodPressure(
					metricValues.bloodPressureSystolic,
					metricValues.bloodPressureDiastolic,
				),
			};
		}

		return {
			label: metricMeta[key].label,
			value: formatValue(
				metricValues[key],
				getCondensedUnit(metricMeta[key].unit),
			),
		};
	});

	return (
		<div className={cn("w-full", className)}>
			{condensed ? (
				<div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
					{condensedVitalsDisplay.map((vital) => (
						<div key={vital.label} className="flex flex-col gap-0.5">
							<span className="text-xs text-muted-foreground">
								{vital.label}
							</span>
							<span className="text-sm font-medium leading-tight tabular-nums">
								{vital.value}
							</span>
						</div>
					))}
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
					{fullVitals.map((vital) => (
						<VitalField
							key={vital.name}
							label={vital.label}
							unit={vital.unit}
							name={vital.name}
							placeholder={vital.placeholder}
							value={vital.value}
						/>
					))}
				</div>
			)}
		</div>
	);
};

export default VitalsList;
