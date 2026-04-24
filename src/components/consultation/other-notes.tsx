import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CondensedLabel } from "src/components/condensed-label";
import { cn } from "src/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "../ui/button";

type OtherNotesProps = {
	value: string;
	onChange: (value: string) => void;
};

export default function OtherNotes({ value, onChange }: OtherNotesProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		// scroll into view when expanded
		if (isExpanded && textareaRef.current) {
			textareaRef.current.scrollIntoView();
		}
	}, [isExpanded]);

	return (
		<div
			className={cn(
				"col-span-1 text-card-foreground md:col-span-2",
				!isExpanded && "py-2!",
			)}
		>
			<CondensedLabel className="hover:cursor-pointer">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setIsExpanded((prev) => !prev)}
					className="size-6 hover:bg-transparent"
				>
					{isExpanded ? <Minus /> : <Plus />}
				</Button>
				Other notes
			</CondensedLabel>
			{isExpanded && (
				<Textarea
					ref={textareaRef}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="mt-2 resize-none min-h-24"
					placeholder="Relevant history, assessment, plan, follow-up instructions, referral details, or other clinical notes..."
				/>
			)}
		</div>
	);
}
