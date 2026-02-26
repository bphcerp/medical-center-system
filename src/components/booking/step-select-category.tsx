import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Category } from "./types";

export default function StepSelectCategory({
	categories,
	onSelect,
}: {
	categories: Category[];
	onSelect: (cat: Category) => void;
}) {
	const [selectedId, setSelectedId] = useState<string>("");

	const handleContinue = () => {
		const cat = categories.find((c) => c.id === Number(selectedId));
		if (cat) onSelect(cat);
	};

	return (
		<div className="flex flex-col items-center gap-6 max-w-md mx-auto">
			<Select value={selectedId} onValueChange={setSelectedId}>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select Specialist Category" />
				</SelectTrigger>
				<SelectContent>
					{categories.map((cat) => (
						<SelectItem key={cat.id} value={String(cat.id)}>
							{cat.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Button
				onClick={handleContinue}
				disabled={!selectedId}
				className="w-full"
				size="lg"
			>
				Continue
				<ChevronRight className="size-4 ml-1" />
			</Button>
		</div>
	);
}
