import { cva } from "class-variance-authority";
import type { patientTypeEnum } from "@/db/patient";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

type PatientType = (typeof patientTypeEnum.enumValues)[number];

const patientTypeBadgeVariants = cva("border rounded-sm", {
	variants: {
		patientType: {
			professor: "text-bits-light-blue border-bits-light-blue",
			dependent: "text-bits-light-blue border-bits-light-blue",
			visitor: "text-bits-red border-bits-red",
			student: "text-bits-green border-bits-green",
			default: "text-muted-foreground border-muted-foreground",
		},
	},
	defaultVariants: {
		patientType: "default",
	},
});

export function PatientTypeBadge({
	type,
	className,
	children,
	...props
}: React.PropsWithChildren<{
	type?: PatientType;
}> &
	React.ComponentProps<typeof Badge>) {
	return (
		<Badge
			variant="outline"
			className={cn(patientTypeBadgeVariants({ patientType: type }), className)}
			{...props}
		>
			{children ?? type}
		</Badge>
	);
}
