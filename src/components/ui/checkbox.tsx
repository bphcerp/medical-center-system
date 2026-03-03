import { cva, VariantProps } from "class-variance-authority";
import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const checkboxVariants = cva(
	"peer border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
	{
		variants: {
			variant: {
				default:
					"data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary",
				secondary:
					"data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground dark:data-[state=checked]:bg-secondary data-[state=checked]:border-secondary",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function Checkbox({
	className,
	variant,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> &
	VariantProps<typeof checkboxVariants>) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				checkboxVariants({ variant, className }),
				"transition-colors",
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="grid place-content-center text-current transition-none"
			>
				<CheckIcon className="size-3.5" strokeWidth={3} />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
