import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "src/lib/utils";
import { Button } from "./ui/button";

const circleButtonVariants = cva(
	"h-7 w-7 disabled:bg-transparent rounded-full",
	{
		variants: {
			variant: {
				default: "",
				destructive:
					"hover:bg-destructive hover:text-destructive-foreground hover:border-destructive",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export function CircleButton({
	children,
	variant,
	className,
	...props
}: React.ComponentProps<typeof Button> &
	VariantProps<typeof circleButtonVariants>) {
	return (
		<Button
			variant="card"
			className={cn(circleButtonVariants({ variant, className }))}
			size="sm"
			{...props}
		>
			{children}
		</Button>
	);
}
