import {
	AlertCircle,
	BriefcaseMedical,
	CalendarIcon,
	Minus,
	Package,
	Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AddQuantityModal } from "@/components/inventory/add-quantity-modal";
import { DispenseModal } from "@/components/inventory/dispense-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import type { Batch, Medicine } from "@/lib/types/inventory";

export function MedicineBatchesSheet({
	open,
	onOpenChange,
	setIsOpenAddBatch,
	medicine,
	batches,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	setIsOpenAddBatch: (isOpenAddBatch: boolean) => void;
	medicine: Medicine | null;
	batches: Batch[] | null;
}) {
	const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
	const [selectedBatchNum, setSelectedBatchNum] = useState<string>("");

	const [isOpenAddQuantity, setIsOpenAddQuantity] = useState<boolean>(false);
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

	const handleAddBatch = () => {
		setIsOpenAddBatch(true);
		onOpenChange(false);
	};

	const totalStock = useMemo(() => {
		return batches?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
	}, [batches]);

	if (!batches || !medicine) return;

	return (
		<>
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent className="sm:max-w-xl w-full p-0 flex flex-col bg-slate-100/100">
					<SheetHeader className="p-6 bg-white space-y-4">
						<div className="flex items-start justify-between">
							<div className="space-y-1">
								<div className="flex gap-2 mb-2">
									<span className="px-2 py-1 rounded bg-primary/10 font-mono text-xs text-primary">
										{medicine.type}
									</span>
									<span className="text-xs text-muted-foreground font-mono bg-slate-100 px-2 py-1 rounded">
										{medicine.drug}
									</span>
								</div>
								<SheetTitle className="text-2xl font-bold">
									{medicine.brand}
								</SheetTitle>
								<SheetDescription className="text-base font-medium text-slate-600">
									{medicine.company}{" "}
									<span className="text-slate-900">{medicine.strength}</span>
								</SheetDescription>
							</div>
							<div className="flex flex-col items-end bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
								<span className="text-xs font-medium uppercase tracking-wide">
									Total Stock
								</span>
								<div className="flex items-center gap-2 text-xl font-bold">
									<Package className="w-5 h-5" />
									{totalStock}
								</div>
							</div>
						</div>
					</SheetHeader>

					<ScrollArea className="flex-1 px-6 py-2">
						<div className="space-y-6">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
									Active Batches ({batches.length})
								</h3>
								<Button
									onClick={handleAddBatch}
									size="sm"
									variant="outline"
									className="h-8 gap-1"
								>
									<Plus className="w-3.5 h-3.5" />
									New Batch
								</Button>
							</div>

							{batches.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-xl border border-dashed border-slate-300 p-8">
									<div className="bg-blue-50 p-4 rounded-full mb-4">
										<BriefcaseMedical className="w-8 h-8 text-blue-500" />
									</div>
									<h3 className="font-semibold text-lg mb-1">
										No Active Batches
									</h3>
									<p className="text-muted-foreground text-sm max-w-[20rem]">
										Inventory is empty for this medicine.
									</p>
									<p className="text-muted-foreground text-sm max-w-[15rem] mb-4">
										Add a batch to get started.
									</p>
									<Button onClick={handleAddBatch}>Add First Batch</Button>
								</div>
							) : (
								<div className="grid gap-4">
									{batches.map((batch) => {
										const expiryDate = new Date(batch.expiry);
										const isExpired = expiryDate <= new Date();

										return (
											<div
												key={batch.id}
												className="group relative flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border shadow-sm transition-all hover:shadow-md"
											>
												<div className="flex-1 space-y-3">
													<div className="flex items-center justify-between">
														<div className="flex items-center gap-2">
															<span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
																Batch
															</span>
															<span className="font-mono font-semibold text-slate-900 text-sm">
																{batch.batchNum}
															</span>
														</div>
														{isExpired && (
															<Badge variant="destructive" className="gap-1">
																<AlertCircle className="w-3 h-3" /> Expired
															</Badge>
														)}
													</div>

													<div className="grid grid-cols-2 gap-4">
														<div className="space-y-1">
															<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
																<CalendarIcon className="w-3.5 h-3.5" /> Expiry
																Date
															</span>
															<p className="font-medium text-sm">
																{expiryDate.toLocaleDateString(undefined, {
																	year: "numeric",
																	month: "short",
																	day: "numeric",
																})}
															</p>
														</div>
														<div className="space-y-1">
															<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
																<Package className="w-3.5 h-3.5" /> Quantity
															</span>
															<p className="font-medium text-sm text-slate-700">
																{batch.quantity} units
															</p>
														</div>
													</div>
												</div>

												<div className="flex sm:flex-col items-center sm:justify-center gap-2 pt-2 sm:pt-0 sm:border-l sm:pl-4 border-t sm:border-t-0">
													<Button
														size="sm"
														className="flex-1 sm:w-full text-xs h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 justify-start"
														onClick={() =>
															openAddQuantity(batch.id, batch.batchNum)
														}
													>
														<Plus className="w-3.5 h-3.5 mr-1.5" /> Add
													</Button>
													<Button
														size="sm"
														className="flex-1 sm:w-full text-xs h-8 justify-start"
														onClick={() =>
															openDispense(batch.id, batch.batchNum)
														}
													>
														<Minus className="w-3.5 h-3.5 mr-1.5" /> Dispense
													</Button>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</ScrollArea>
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
