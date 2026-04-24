import { cva, type VariantProps } from "class-variance-authority";
import type { Patient } from "@/lib/types/patient";
import { ageSexString, cn } from "@/lib/utils";
import { PatientTypeBadge } from "./patient-type-badge";

const labelVariants = cva("italic mb-1 text-muted-foreground", {
	variants: {
		size: {
			default: "mb-2",
			sm: "text-xs font-normal",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

const tokenBadgeVariants = cva(
	"text-3xl border px-3 tabular-nums tracking-tight font-semibold flex items-center",
	{
		variants: {
			size: {
				default: "min-w-14",
				sm: "text-2xl px-2 min-w-12",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

const nameVariants = cva("text-3xl font-bold", {
	variants: {
		size: {
			default: "",
			sm: "text-lg",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

const subtitleVariants = cva("text-muted-foreground font-medium text-lg", {
	variants: {
		size: {
			default: "",
			sm: "text-sm",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

const typeBadgeVariants = cva("", {
	variants: {
		size: {
			default: "",
			sm: "text-xs font-medium",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

const detailsStackVariants = cva("flex flex-col", {
	variants: {
		size: {
			default: "gap-0.5",
			sm: "gap-0",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

type PatientDetailsProps = VariantProps<typeof nameVariants> & {
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
	size = "default",
}: PatientDetailsProps) {
	return (
		<div>
			{label && <p className={labelVariants({ size })}>{label}</p>}
			<div className={cn("flex items-stretch gap-3")}>
				{token !== undefined && (
					<PatientTypeBadge
						type={patient?.type}
						className={tokenBadgeVariants({ size })}
					>
						{token}
					</PatientTypeBadge>
				)}
				<div className={detailsStackVariants({ size })}>
					{patient.name && (
						<span className={nameVariants({ size })}>{patient.name}</span>
					)}
					<span className="flex items-center gap-2">
						<span className={subtitleVariants({ size })}>
							{subtitle ?? ageSexString(patient.age, patient.sex)}
						</span>
						{patient.type && (
							<PatientTypeBadge
								type={patient.type}
								className={typeBadgeVariants({ size })}
							/>
						)}
					</span>
				</div>
			</div>
		</div>
	);
}
