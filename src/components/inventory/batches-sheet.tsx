import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { AddQuantityModal } from "@/components/inventory/add-quantity-modal";
import { DispenseModal } from "@/components/inventory/dispense-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import type { Batch, Medicine } from "@/lib/types/inventory";

type MedicineBatchesSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	medicine: Medicine | null;
	batches: Batch[] | null;
};

export function MedicineBatchesSheet({
	open,
	onOpenChange,
	medicine,
	batches,
}: MedicineBatchesSheetProps) {
	const [isOpenAddQuantity, setIsOpenAddQuantity] = useState<boolean>(false);
	const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
	const [selectedBatchNum, setSelectedBatchNum] = useState<string>("");

	const openAddQuantity = (batchId: number, batchNum: string) => {
		setSelectedBatchId(batchId);
		setSelectedBatchNum(batchNum);
		setIsOpenAddQuantity(true);
	};

	const [isOpenDispense, setIsOpenDispense] = useState<boolean>(false);

	const openDispense = (batchId: number, batchNum: string) => {
		setSelectedBatchId(batchId);
		setSelectedBatchNum(batchNum);
		setIsOpenDispense(true);
	};

	if (!batches || !medicine) return;

	return (
		<>
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent className="min-w-xl overflow-y-auto">
					<SheetHeader>
						<SheetTitle className="text-xl">{medicine.brand}</SheetTitle>
						<SheetDescription>
							<div className="flex flex-col gap-1">
								<span>
									{medicine.drug} ({medicine.strength}) - {medicine.type}
								</span>
							</div>
						</SheetDescription>
					</SheetHeader>

					{batches.length === 0 ? (
						<div>No active batches found.</div>
					) : (
						<div>
							{batches.map((batch) => {
								const expiryDate = new Date(batch.expiry);
								const isExpired = expiryDate <= new Date();

								return (
									<Card key={batch.id} className="rounded-none">
										<CardHeader className="bg-muted/50 pb-3 pt-4">
											<div className="flex items-center justify-between">
												<CardTitle>
													Batch #{batch.batchNum}
													{isExpired && (
														<Badge
															variant="destructive"
															className="text-[10px] px-1.5 py-0 h-5"
														>
															Expired
														</Badge>
													)}
												</CardTitle>
												<Badge
													variant="secondary"
													className="text-sm font-semibold px-2.5"
												>
													Quantity: {batch.quantity}
												</Badge>
											</div>
										</CardHeader>
										<CardContent className="py-3">
											<div className="flex items-center text-md text-muted-foreground">
												<CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
												<span>Expiry: </span>
												<span
													className={`ml-1 font-medium ${isExpired ? "text-destructive" : "text-foreground"}`}
												>
													{expiryDate.toLocaleDateString(undefined, {
														dateStyle: "medium",
													})}
												</span>
											</div>
										</CardContent>
										<CardFooter className="flex justify-end gap-2">
											<Button
												variant="outline"
												size="sm"
												className="h-8"
												onClick={() =>
													openAddQuantity(batch.id, batch.batchNum)
												}
											>
												Add Stock
											</Button>
											<Button
												variant="default"
												size="sm"
												className="h-8"
												disabled={isExpired || batch.quantity === 0}
												onClick={() => openDispense(batch.id, batch.batchNum)}
											>
												Dispense
											</Button>
										</CardFooter>
									</Card>
								);
							})}
						</div>
					)}
				</SheetContent>
			</Sheet>
			<AddQuantityModal
				open={isOpenAddQuantity}
				onOpenChange={setIsOpenAddQuantity}
				batchId={selectedBatchId}
				batchNum={selectedBatchNum}
			/>
			<DispenseModal
				open={isOpenDispense}
				onOpenChange={setIsOpenDispense}
				batchId={selectedBatchId}
				batchNum={selectedBatchNum}
			/>
		</>
	);
}
