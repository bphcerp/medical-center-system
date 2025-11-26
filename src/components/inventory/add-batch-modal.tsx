import { useRouter } from "@tanstack/react-router";
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
import type { Medicine } from "@/lib/types/inventory";
import { handleErrors } from "@/lib/utils";
import { client } from "@/routes/api/$";

export function AddBatchModal({
	open,
	onOpenChange,
	inventoryId,
	medicine,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	inventoryId: number | null;
	medicine: Medicine | null;
}) {
	const router = useRouter();

	const [batch, setBatch] = useState<string>("");
	const [expiry, setExpiry] = useState<string>("");
	const [quantity, setQuantity] = useState<number>(0);

	if (!medicine || !inventoryId) return;

	const handleClose = () => {
		setBatch("");
		setExpiry("");
		setQuantity(0);
		onOpenChange(false);
	};

	const handleSubmit = async () => {
		const res = await client.api.inventory.batch.$post({
			json: { medicineId: inventoryId, batchNum: batch, expiry, quantity },
		});
		const data = await handleErrors(res);
		if (!data) {
			return;
		}

		await router.invalidate();
		handleClose();
	};

	if (!medicine) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="mb-1">Add New Stock</DialogTitle>
					<DialogDescription>
						{
							<div className="w-full flex flex-wrap items-center gap-2">
								<span className="font-bold">
									{medicine?.company} {medicine?.brand}
								</span>
								<span className="text-muted-foreground text-sm">
									({medicine?.drug}) - {medicine?.strength}
								</span>
								<span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
									{medicine?.type}
								</span>
							</div>
						}
					</DialogDescription>
				</DialogHeader>

				<div>
					<div className="grid grid-cols-[80px_1fr] gap-y-3 items-center mb-4">
						<Label className="font-bold">Batch ID</Label>
						<Input
							type="string"
							placeholder="Enter batch ID"
							value={batch}
							onChange={(e) => setBatch(e.target.value)}
							required
						/>

						<Label className="font-bold">Expiry</Label>
						<Input
							type="date"
							value={expiry}
							onChange={(e) => setExpiry(e.target.value)}
							required
						/>

						<Label className="font-bold">Quantity</Label>
						<Input
							type="number"
							placeholder="Enter quantity"
							value={quantity}
							onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
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
