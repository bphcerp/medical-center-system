import type { statusEnums } from "@/db/lab";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

type TestStatus = (typeof statusEnums)[number];

function getBadgeColor(status: TestStatus) {
	switch (status) {
		case "Requested":
			return "border-bits-red text-bits-red";
		case "Sample Collected":
			return "border-bits-blue text-bits-blue";
		case "Complete":
			return "border-bits-green text-bits-green";
	}
}

export function LabTestStatusBadge({ status }: { status: TestStatus }) {
	return (
		<Badge
			variant="outline"
			className={cn("text-xs rounded-sm border", getBadgeColor(status))}
		>
			{status}
		</Badge>
	);
}
