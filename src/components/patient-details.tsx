import type React from "react";
import type { Patient } from "@/lib/types/patient";
import { ageSexString, cn } from "@/lib/utils";
import { PatientTypeBadge } from "./patient-type-badge";

type PatientDetailsProps = {
	patient: Partial<Patient>;
	token?: number;
	subtitle?: string;
	label?: React.ReactNode;
};

export function PatientDetails({
	subtitle,
	token,
	label,
	patient,
}: PatientDetailsProps) {
	return (
		<div>
			{label && <p className="italic mb-1 text-muted-foreground">{label}</p>}
			<div
				className={cn(
					"flex items-stretch gap-3",
					token !== undefined && "mt-2",
				)}
			>
				{token !== undefined && (
					<PatientTypeBadge
						type={patient?.type}
						className="text-3xl border px-3 tabular-nums tracking-tight font-semibold flex items-center min-w-14"
					>
						{token}
					</PatientTypeBadge>
				)}
				<div className="flex flex-col gap-0.5">
					{patient.name && (
						<span className="text-3xl font-bold">{patient.name}</span>
					)}
					<span className="flex items-center gap-2">
						<span className="text-muted-foreground font-medium text-lg">
							{subtitle ?? ageSexString(patient.age, patient.sex)}
						</span>
						{patient.type && <PatientTypeBadge type={patient.type} />}
					</span>
				</div>
			</div>
		</div>
	);
}
