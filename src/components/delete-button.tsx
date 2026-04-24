import { cva, type VariantProps } from "class-variance-authority";
import { Trash2 } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const deleteButtonVariants = cva("transition-colors hover:cursor-pointer", {
	variants: {
		shape: {
			square: "size-6 p-0 rounded-md",
			circle: "size-7 p-0 rounded-full",
		},
		variant: {
			coloured: "",
			outline:
				"bg-transparent border-2 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground",
		},
	},
	defaultVariants: {
		shape: "square",
		variant: "coloured",
	},
});

type DeleteButtonProps = Omit<
	React.ComponentProps<typeof Button>,
	"variant" | "size"
> &
	VariantProps<typeof deleteButtonVariants> & {
		icon?: React.ReactNode;
		iconClassName?: string;
	};

export function DeleteButton({
	shape,
	variant,
	icon = <Trash2 className="size-4" />,
	iconClassName,
	className,
	children,
	...props
}: DeleteButtonProps) {
	return (
		<Button
			variant="destructive"
			className={cn(
				deleteButtonVariants({ shape, variant }),
				children && "gap-2",
				className,
			)}
			{...props}
		>
			{icon && <span className={cn("shrink-0", iconClassName)}>{icon}</span>}
			{children}
		</Button>
	);
}

export default DeleteButton;
