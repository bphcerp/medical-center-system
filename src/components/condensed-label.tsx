import type React from "react";
import { cn } from "src/lib/utils";
import { Label } from "./ui/label";

export function CondensedLabel({
	children,
	className,
}: React.PropsWithChildren & React.ComponentProps<typeof Label>) {
	return (
		<Label className={cn("text-sm font-semibold uppercase", className)}>
			{children}
		</Label>
	);
}
