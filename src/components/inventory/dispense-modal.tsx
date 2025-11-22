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
import { handleErrors } from "@/lib/utils";
import { client } from "@/routes/api/$";

export function DispenseModal({
	open,
	onOpenChange,
	batchId,
	batchNum,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	batchId: number | null;
	batchNum: string;
}) {
	const router = useRouter();

	const [quantity, setQuantity] = useState<number>();

	const handleClose = async () => {
		setQuantity(undefined);
		onOpenChange(false);
	};

	const handleSubmit = async () => {
		if (!batchId || quantity == null) return;
		const res = await client.api.inventory.dispense.$post({
			json: { batchId, quantity },
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
					<DialogTitle className="mb-1">Dispense</DialogTitle>
					<DialogDescription>
						Dispense stock from batch <b>{batchNum}</b>
					</DialogDescription>
				</DialogHeader>

				<div>
					<Input
						type="number"
						placeholder="Enter quantity"
						value={quantity}
						onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
						required
					/>
					<Button className="my-2 mr-2" onClick={handleClose} variant="outline">
						Cancel
					</Button>
					<Button onClick={handleSubmit}>Submit</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
