import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type FinalizeButtonValue = "Finalize (OPD)" | "Admit" | "Referral";

const FinalizeCaseCard = ({
	setLabTestModalOpen,
	handleFinalize,
	finalizeButtonValue,
	setFinalizeButtonValue,
}: {
	setLabTestModalOpen: (open: boolean) => void;
	handleFinalize: () => void;
	finalizeButtonValue: FinalizeButtonValue;
	setFinalizeButtonValue: (value: FinalizeButtonValue) => void;
}) => {
	return (
		<Card className="col-span-4 row-span-1 rounded-tr-none rounded-tl-none py-2 px-2">
			<div className="flex justify-end gap-2">
				<Button variant="outline" onClick={() => setLabTestModalOpen(true)}>
					Request Lab Tests
				</Button>
				<ButtonGroup>
					<Button variant="outline" onClick={handleFinalize}>
						{finalizeButtonValue}
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline">
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
		</Card>
	);
};

export default FinalizeCaseCard;
