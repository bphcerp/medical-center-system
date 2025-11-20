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
import { client } from "@/routes/api/$";
import type { Medicine } from "@/routes/inventory";

export function AddBatchModal({
	open,
	onOpenChange,
	medicine,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	medicine: Medicine | null;
}) {
	const router = useRouter();

	const [batch, setBatch] = useState<string>("");
	const [expiry, setExpiry] = useState<string>("");
	const [quantity, setQuantity] = useState<number>(0);
	const [batchError, setBatchError] = useState<boolean>(false);
	const [expiryError, setExpiryError] = useState<boolean>(false);
	const [quantityError, setQuantityError] = useState<boolean>(false);
	const [apiError, setApiError] = useState<boolean>(false);

	if (!medicine) return;

	const resetState = () => {
		setBatch("");
		setBatchError(false);
		setExpiry("");
		setExpiryError(false);
		setQuantity(0);
		setQuantityError(false);
		setApiError(false);
	};

	const handleSubmit = async () => {
		if (quantity == null || quantity <= 0) {
			resetState();
			setQuantityError(true);
			return;
		}

		if (batch == null) {
			resetState();
			setBatchError(true);
			return;
		}

		if (expiry === "") {
			resetState();
			setExpiryError(true);
			return;
		}

		const res = await client.api.inventory.batch.$post({
			json: { medicineId: medicine.id, batchNum: batch, expiry, quantity },
		});

		if (res.status === 200) {
			await router.invalidate();
			resetState();
			onOpenChange(false);
		} else {
			resetState();
			setApiError(true);
		}
	};

	const handleCancel = () => {
		resetState();
		onOpenChange(false);
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
						/>

						<Label className="font-bold">Expiry</Label>
						<Input
							type="date"
							value={expiry}
							onChange={(e) => setExpiry(e.target.value)}
						/>

						<Label className="font-bold">Quantity</Label>
						<Input
							type="number"
							placeholder="Enter quantity"
							value={quantity}
							onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
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
					{batchError && (
						<p className="text-destructive">Error: Batch ID cannot be empty!</p>
					)}
					{expiryError && (
						<p className="text-destructive">Error: Date cannot be empty!</p>
					)}
					{quantityError && (
						<p className="text-destructive">
							Error: Quantity cannot be negative or zero!
						</p>
					)}
					{apiError && (
						<p className="text-destructive">Error: Failed to add a batch</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
