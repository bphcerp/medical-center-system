import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

const DeletableBadge = ({
	onClick,
	className,
	children,
	...props
}: React.PropsWithChildren<{ onClick?: () => void }> &
	React.ComponentProps<typeof Badge>) => {
	return (
		<Badge
			variant="outline"
			onClick={onClick}
			className={cn(
				"font-medium py-1 px-1 text-sm/1 transition-colors flex gap-2 select-none",
				"[&>svg]:size-4 hover:cursor-pointer",
				"hover:bg-destructive hover:text-destructive-foreground hover:border-destructive",
				className,
			)}
			{...props}
		>
			{children}
		</Badge>
	);
};

export default DeletableBadge;
