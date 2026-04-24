import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type FinalizeButtonValue = "Finalize (OPD)" | "Admit" | "Referral";

const FinalizeCase = ({
	handleFinalize,
	finalizeButtonValue,
	setFinalizeButtonValue,
	disabled = false,
}: {
	handleFinalize: () => void;
	finalizeButtonValue: FinalizeButtonValue;
	setFinalizeButtonValue: (value: FinalizeButtonValue) => void;
	disabled?: boolean;
}) => {
	return (
		<div className="text-card-foreground col-span-4 row-span-1 rounded-tr-none rounded-tl-none py-2 flex justify-end gap-2 items-center">
			{disabled && (
				<span className="text-xs text-muted-foreground mr-2">
					Fill in at least one field to enable finalization
				</span>
			)}
			<ButtonGroup>
				<Button
					onClick={handleFinalize}
					disabled={disabled}
					title={
						disabled
							? "Fill in at least one field (complaints, notes, diagnosis, or prescription) to enable"
							: undefined
					}
				>
					{finalizeButtonValue}
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button disabled={disabled}>
							<ChevronDown />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onClick={() => setFinalizeButtonValue("Finalize (OPD)")}
						>
							Finalise (OPD)
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setFinalizeButtonValue("Admit")}>
							Admit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setFinalizeButtonValue("Referral")}
						>
							Referral
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</ButtonGroup>
		</div>
	);
};

export default FinalizeCase;
