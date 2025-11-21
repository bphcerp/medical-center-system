import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

type TokenButtonProps = {
	selected?: boolean;
	token: string;
};

export function TokenButton({
	selected,
	token,
	children,
	className,
	...props
}: React.PropsWithChildren<TokenButtonProps> &
	React.ComponentProps<typeof Button>) {
	return (
		<Button
			variant="ghost"
			className={cn(
				"flex gap-3 p-0 rounded-lg border-2 items-stretch overflow-clip bg-card h-auto w-full group font-normal",
				selected && "border-primary",
				className,
			)}
			{...props}
		>
			<span
				className={cn(
					"content-center min-w-13 px-2 text-center",
					"font-semibold tabular-nums tracking-tight text-lg transition-colors",
					selected
						? "bg-primary text-primary-foreground"
						: "bg-accent text-accent-foreground",
				)}
			>
				{token}
			</span>
			<div className="grow text-base py-2 pr-2 whitespace-normal text-left">
				{children}
			</div>
		</Button>
	);
}

export function TokenButtonTitle({
	children,
	className,
	...props
}: React.PropsWithChildren<React.ComponentProps<"span">>) {
	return (
		<span className={cn("text-lg font-medium", className)} {...props}>
			{children}
		</span>
	);
}
