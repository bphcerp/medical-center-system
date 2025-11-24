import { createFileRoute } from "@tanstack/react-router";
import { Package2, SquarePen, SquarePlus, Trash } from "lucide-react";
import React, { useState } from "react";
import { AddBatchModal } from "@/components/inventory/add-batch-modal";
import { AddMedicinesModal } from "@/components/inventory/add-medicines-modal";
import { MedicineBatchesSheet } from "@/components/inventory/batches-sheet";
import { ChangeCriticalQtyModal } from "@/components/inventory/change-critical-qty-modal";
import { DeleteMedicineModal } from "@/components/inventory/delete-medicine-modal";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import useAuth from "@/lib/hooks/useAuth";
import type { Medicine } from "@/lib/types/inventory";
import { handleErrors } from "@/lib/utils";
import { client } from "./api/$";

export const Route = createFileRoute("/inventory")({
	loader: async () => {
		const inventoryRes = await client.api.inventory.$get();
		const medicinesRes = await client.api.inventory.medicines.$get();
		const inventory = await handleErrors(inventoryRes);
		const medicines = await handleErrors(medicinesRes);
		if (!inventory || !medicines) {
			return { inventory: [], medicines: [] };
		}
		return { inventory, medicines };
	},
	staticData: {
		requiredPermissions: ["inventory"],
		icon: Package2,
		name: "Inventory Management",
	},
	component: InventoryPage,
});

function InventoryPage() {
	useAuth(["inventory"]);
	const { inventory, medicines } = Route.useLoaderData();

	const [inventoryQuery, setInventoryQuery] = useState<string>("");
	const [filterMode, setFilterMode] = useState<
		"all" | "lowStock" | "nearExpiry" | "expired"
	>("all");

	const [isOpenAddMedicines, setIsOpenAddMedicines] = useState<boolean>(false);

	const openAddMedicines = () => {
		setIsOpenAddMedicines(true);
	};

	const [isOpenDeleteMedicine, setIsOpenDeleteMedicine] =
		useState<boolean>(false);

	const openDeleteMedicine = (
		selectedInventoryId: number,
		selectedMedicine: Medicine,
	) => {
		setSelectedInventoryId(selectedInventoryId);
		setSelectedMedicine(selectedMedicine);
		setIsOpenDeleteMedicine(true);
	};

	const [isOpenAddBatch, setIsOpenAddBatch] = useState<boolean>(false);
	const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(
		null,
	);
	const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(
		null,
	);

	const openAddBatch = (
		selectedInventoryId: number,
		selectedMedicine: Medicine,
	) => {
		setSelectedInventoryId(selectedInventoryId);
		setSelectedMedicine(selectedMedicine);
		setIsOpenAddBatch(true);
	};

	const [isOpenChangeCriticalQty, setIsOpenChangeCriticalQty] =
		useState<boolean>(false);
	const [selectedCriticalQty, setSelectedCriticalQty] = useState<number>(0);

	const openChangeCriticalQty = (
		selectedMedicine: Medicine,
		criticalQty: number,
	) => {
		setSelectedMedicine(selectedMedicine);
		setSelectedCriticalQty(criticalQty);
		setIsOpenChangeCriticalQty(true);
	};

	const [isOpenBatchesSheet, setIsOpenBatchesSheet] = useState<boolean>(false);

	const openBatchesSheet = (medicine: Medicine) => {
		setSelectedMedicine(medicine);
		setIsOpenBatchesSheet(true);
	};

	const terms = inventoryQuery.trim().toLowerCase().split(/\s+/);

	const getFilteredByMode = (items: typeof inventory) => {
		const now = new Date();
		const threshold = new Date();
		threshold.setDate(now.getDate() + 30);

		return items.filter((item) => {
			if (filterMode === "lowStock") {
				return item.criticalQty !== null && item.quantity <= item.criticalQty;
			}
			if (filterMode === "nearExpiry") {
				return item.batches.some((b) => {
					const expiry = new Date(b.expiry);
					return expiry > now && expiry <= threshold;
				});
			}
			if (filterMode === "expired") {
				return item.batches.some((b) => new Date(b.expiry) <= now);
			}
			return true;
		});
	};

	const finalInventory = getFilteredByMode(inventory)
		.reduce(
			(acc, inventoryItem) => {
				if (inventoryQuery === "") {
					acc.push({
						inventoryItem,
						count: 0,
					});
					return acc;
				}

				const medicineText = `
					${inventoryItem.medicine.drug}
					${inventoryItem.medicine.brand}
					${inventoryItem.medicine.company}
					${inventoryItem.medicine.type}
					`.toLowerCase();

				const medicineMatchesCount = terms.reduce((c, term) => {
					return c + (medicineText.includes(term) ? 1 : 0);
				}, 0);

				const matchedBatches = inventoryItem.batches.filter((batch) => {
					const batchText = batch.batchNum.toLowerCase();
					return terms.some((term) => batchText.includes(term));
				});

				const count = medicineMatchesCount + matchedBatches.length;

				if (count === 0) return acc;

				if (medicineMatchesCount > 0) {
					acc.push({
						inventoryItem,
						count,
					});
				} else {
					acc.push({
						inventoryItem: {
							...inventoryItem,
							batches: matchedBatches,
						},
						count,
					});
				}

				return acc;
			},
			[] as { inventoryItem: (typeof inventory)[0]; count: number }[],
		)
		.sort((a, b) => b.count - a.count)
		.map((f) => f.inventoryItem);

	const selectedInventoryItem = inventory.find(
		(item) => item.medicine.id === selectedMedicine?.id,
	);

	const currentBatches = selectedInventoryItem?.batches || [];

	return (
		<>
			<TopBar title="Inventory Dashboard" />
			<div className="mx-6 my-2.5 flex items-center justify-between">
				<h1 className="text-3xl font-bold">Medicine Inventory</h1>
				<div className="flex items-center w-full max-w-3xl">
					<Button className="mr-2" onClick={() => openAddMedicines()}>
						<SquarePlus />
						Add Medicine
					</Button>
					<Button
						className="mr-2"
						onClick={() =>
							setFilterMode(filterMode === "lowStock" ? "all" : "lowStock")
						}
						variant={filterMode === "lowStock" ? "default" : "outline"}
					>
						Low Stock
					</Button>
					<Button
						className="mr-2"
						onClick={() =>
							setFilterMode(filterMode === "nearExpiry" ? "all" : "nearExpiry")
						}
						variant={filterMode === "nearExpiry" ? "default" : "outline"}
					>
						Near Expiry
					</Button>
					<Button
						className="mr-2"
						onClick={() =>
							setFilterMode(filterMode === "expired" ? "all" : "expired")
						}
						variant={filterMode === "expired" ? "default" : "outline"}
					>
						Expired
					</Button>
					<Input
						type="text"
						placeholder="Search for inventory medicines here..."
						value={inventoryQuery}
						onChange={(e) => setInventoryQuery(e.target.value)}
					/>
				</div>
			</div>

			<Card>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Medicine</TableHead>
								<TableHead>Critical Quantity</TableHead>
								<TableHead>Total Quantity</TableHead>
								<TableHead>Quick Actions</TableHead>
							</TableRow>
						</TableHeader>

						<TableBody>
							{finalInventory.map((item) => (
								<React.Fragment key={item.id}>
									<TableRow>
										<TableCell className="cursor-pointer">
											<span className="align-middle font-semibold mr-2">
												{item.medicine.company} {item.medicine.brand}
											</span>
											<span className="align-middle text-muted-foreground mr-2">
												({item.medicine.drug}) - {item.medicine.strength}
											</span>
											<span className="align-middle px-2 py-2 rounded-sm bg-primary/10 text-primary mr-2">
												{item.medicine.type}
											</span>
											<Button
												variant="outline"
												className="align-middle hover:bg-destructive hover:text-destructive-foreground hover:border-destructive ml-1"
												onClick={() =>
													openDeleteMedicine(item.id, item.medicine)
												}
											>
												<Trash />
											</Button>
										</TableCell>
										<TableCell>
											<span className="align-middle mr-2">
												{item.criticalQty}
											</span>
											<Button
												variant="outline"
												className="align-middle"
												onClick={() =>
													openChangeCriticalQty(
														item.medicine,
														item.criticalQty ?? 0,
													)
												}
											>
												<SquarePen />
											</Button>
										</TableCell>
										<TableCell>{item.quantity}</TableCell>
										<TableCell className="flex space-x-2">
											<Button
												className="flex-1 w-full"
												onClick={() => openAddBatch(item.id, item.medicine)}
											>
												Add Batch
											</Button>
											<Button
												className="flex-1 w-full"
												onClick={() => openBatchesSheet(item.medicine)}
											>
												Show Batches
											</Button>
										</TableCell>
									</TableRow>
								</React.Fragment>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
			<MedicineBatchesSheet
				open={isOpenBatchesSheet}
				onOpenChange={setIsOpenBatchesSheet}
				setIsOpenAddBatch={setIsOpenAddBatch}
				medicine={selectedMedicine}
				batches={currentBatches}
			/>
			<DeleteMedicineModal
				open={isOpenDeleteMedicine}
				onOpenChange={setIsOpenDeleteMedicine}
				inventoryId={selectedInventoryId}
				medicine={selectedMedicine}
			/>
			<ChangeCriticalQtyModal
				open={isOpenChangeCriticalQty}
				onOpenChange={setIsOpenChangeCriticalQty}
				medicine={selectedMedicine}
				currentCriticalQty={selectedCriticalQty}
			/>
			<AddMedicinesModal
				open={isOpenAddMedicines}
				onOpenChange={setIsOpenAddMedicines}
				medicines={medicines}
			/>
			<AddBatchModal
				open={isOpenAddBatch}
				onOpenChange={setIsOpenAddBatch}
				inventoryId={selectedInventoryId}
				medicine={selectedMedicine}
			/>
		</>
	);
}
