import { BriefcaseMedical, CalendarIcon } from "lucide-react";
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
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
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
						<SheetTitle className="text-3xl font-bold">
							<span>
								{medicine.company} {medicine.brand}
							</span>
						</SheetTitle>
						<SheetDescription className="text-lg">
							<span className="text-muted-foreground mr-2">
								({medicine.drug}) - {medicine.strength}
							</span>
							<span className="px-2 py-2 rounded-sm bg-primary/10 text-primary mr-2">
								{medicine.type}
							</span>
						</SheetDescription>
					</SheetHeader>

					{batches.length === 0 ? (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon" className="!w-16 !h-16">
									<BriefcaseMedical className="!w-10 !h-10" />
								</EmptyMedia>
								<EmptyTitle>No Active Batches</EmptyTitle>
								<EmptyDescription>
									<p>You haven&apos;t added any batches yet.</p>
									<p>Get started by adding a batch.</p>
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<div className="flex gap-2">
									<Button>Add Batch</Button>
									{/* TODO: Add functionality */}
								</div>
							</EmptyContent>
						</Empty>
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
