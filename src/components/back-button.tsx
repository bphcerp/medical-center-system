import { ArrowLeft } from "lucide-react";
import { cn } from "src/lib/utils";
import { Button } from "@/components/ui/button";

type BackButtonProps = {
	onClick: () => void;
};

export function BackButton({
	onClick,
	className,
	...props
}: BackButtonProps & React.ComponentProps<typeof Button>) {
	return (
		<Button
			onClick={onClick}
			variant="ghost"
			className={cn("p-4 aspect-square text-muted-foreground", className)}
			{...props}
		>
			<ArrowLeft className="size-5" strokeWidth={2} />
		</Button>
	);
}

export default BackButton;
