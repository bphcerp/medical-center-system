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

export function AddQuantityModal({
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

	const [quantity, setQuantity] = useState<number>(0);
	const [quantityError, setQuantityError] = useState<boolean>(false);
	const [apiError, setApiError] = useState<boolean>(false);

	const resetState = () => {
		setQuantity(0);
		setQuantityError(false);
		setApiError(false);
	};

	const handleSubmit = async () => {
		if (!batchId) return;

		if (quantity == null || quantity <= 0) {
			resetState();
			setQuantityError(true);
			return;
		}

		const res = await client.api.inventory.addQuantity.$post({
			json: { batchId, quantity },
		});

		if (res.status === 200) {
			await router.invalidate();
			onOpenChange(false);
			resetState();
		} else {
			resetState();
			setApiError(true);
		}
	};

	const handleCancel = () => {
		onOpenChange(false);
		resetState();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="mb-1">Add Quantity</DialogTitle>
					<DialogDescription>
						Add stock to batch <b>{batchNum}</b>
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
						<p className="text-destructive">Error: Failed to add quantity</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
