import type { patientTypeEnum } from "@/db/patient";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

type PatientType = (typeof patientTypeEnum.enumValues)[number];

export function PatientTypeBadge({
	type,
	className,
	children,
	...props
}: React.PropsWithChildren<{
	type?: PatientType;
}> &
	React.ComponentProps<typeof Badge>) {
	let color: string;
	switch (type) {
		case "professor":
		case "dependent":
			color = "text-bits-light-blue border-bits-light-blue";
			break;
		case "visitor":
			color = "text-bits-red border-bits-red";
			break;
		case "student":
			color = "text-bits-green border-bits-green";
			break;
		default:
			color = "text-muted-foreground border-muted-foreground";
			break;
	}
	return (
		<Badge
			variant="outline"
			className={cn("border rounded-sm", color, className)}
			{...props}
		>
			{children ?? type}
		</Badge>
	);
}
