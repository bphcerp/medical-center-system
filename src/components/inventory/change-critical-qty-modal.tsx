import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Medicine } from "@/routes/inventory";

export function ChangeCriticalQtyModal({
	open,
	onOpenChange,
	medicine,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	medicine: Medicine | null;
}) {
	const [criticalQty, setCriticalQty] = useState<number>(0);
	const [criticalQtyError, setCriticalQtyError] = useState<boolean>(false);
	const [apiError, setApiError] = useState<boolean>(false);

	if (!medicine) return;

	const resetState = () => {
		setCriticalQty(0);
		setCriticalQtyError(false);
		setApiError(false);
	};

	const handleSubmit = async () => {
		if (criticalQty == null || criticalQty < 0) {
			resetState();
			setCriticalQtyError(true);
			return;
		}
	};

	const handleCancel = () => {
		resetState();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="mb-1">Change Critical Quantity</DialogTitle>
					<DialogDescription>
						{
							<div className="w-full flex flex-wrap items-center gap-2">
								<span className="font-bold">
									{medicine.company} {medicine.brand}
								</span>
								<span className="text-muted-foreground text-sm">
									({medicine.drug}) - {medicine.strength}
								</span>
								<span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
									{medicine.type}
								</span>
							</div>
						}
					</DialogDescription>
				</DialogHeader>

				<div>
					<div className="grid grid-cols-[80px_1fr] gap-y-3 items-center mb-4">
						<Label className="font-bold">Critical Quantity</Label>
						<Input
							type="number"
							placeholder="Enter critical quantity"
							value={criticalQty}
							onChange={(e) => setCriticalQty(parseInt(e.target.value, 10))}
						/>
					</div>
					<Button
						className="my-2 mr-2"
						onClick={handleCancel}
						variant="outline"
					>
						Cancel
					</Button>
					<Button onClick={handleSubmit}>Submit</Button>
					{criticalQtyError && (
						<p className="text-destructive">
							Error: Quantity cannot be negative!
						</p>
					)}
					{apiError && (
						<p className="text-destructive">
							Error: Failed to update critical quantity
						</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
