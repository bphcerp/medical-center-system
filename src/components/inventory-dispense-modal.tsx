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
	const [quantityError, setQuantityError] = useState<boolean>(false);
	const [apiError, setApiError] = useState<boolean>(false);

	const handleSubmit = async () => {
		if (!batchId || quantity == null) return;

		if (quantity <= 0) {
			setQuantityError(true);
		}

		const res = await client.api.inventory.dispense.$post({
			json: { batchId, quantity },
		});

		if (res.status === 200) {
			await router.invalidate();
			onOpenChange(false);
			setQuantity(undefined);
			setQuantityError(false);
			setApiError(false);
		} else {
			setQuantity(undefined);
			setApiError(true);
		}
	};

	const handleCancel = async () => {
		onOpenChange(false);
		setQuantity(undefined);
		setQuantityError(false);
		setApiError(false);
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
					/>
					<Button
						className="my-2 mr-2"
						onClick={handleCancel}
						variant="outline"
					>
						Cancel
					</Button>
					<Button onClick={handleSubmit}>Submit</Button>
					{quantityError && (
						<p className="text-destructive">
							Error: Quantity cannot be negative or zero!
						</p>
					)}
					{apiError && (
						<p className="text-destructive">
							Error: Failed to dispense quantity
						</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
