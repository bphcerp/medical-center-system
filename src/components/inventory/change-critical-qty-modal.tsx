import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import type { Medicine } from "@/lib/types/inventory";
import { handleErrors } from "@/lib/utils";
import { client } from "@/routes/api/$";

export function ChangeCriticalQtyModal({
	open,
	onOpenChange,
	medicine,
	currentCriticalQty,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	medicine: Medicine | null;
	currentCriticalQty?: number;
}) {
	const router = useRouter();

	const [criticalQty, setCriticalQty] = useState<number>(
		currentCriticalQty ?? 0,
	);

	useEffect(() => {
		if (open && currentCriticalQty !== undefined) {
			setCriticalQty(currentCriticalQty);
		}
	}, [open, currentCriticalQty]);

	if (!medicine) return;

	const handleClose = () => {
		setCriticalQty(0);
		onOpenChange(false);
	};

	const handleSubmit = async () => {
		const res = await client.api.inventory.changeCriticalQty.$post({
			json: { medicineId: medicine.id, criticalQty },
		});
		const data = await handleErrors(res);
		if (!data) {
			return;
		}
		await router.invalidate();
		handleClose();
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
							required
						/>
					</div>
					<Button className="my-2 mr-2" onClick={handleClose} variant="outline">
						Cancel
					</Button>
					<Button onClick={handleSubmit}>Submit</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
