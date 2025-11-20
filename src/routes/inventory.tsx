import { createFileRoute, redirect } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import React, { useEffect, useState } from "react";
import { AddBatchModal } from "@/components/inventory-add-batch-modal";
import { AddQuantityModal } from "@/components/inventory-add-quantity-modal";
import { DispenseModal } from "@/components/inventory-dispense-modal";
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
import { client } from "./api/$";

// Maybe make this standard?
export type Medicine = {
	id: number;
	drug: string;
	company: string;
	brand: string;
	strength: string;
	type: string;
	price: number;
};

export const Route = createFileRoute("/inventory")({
	loader: async () => {
		const res = await client.api.user.$get();
		if (res.status !== 200) {
			throw redirect({
				to: "/login",
			});
		}
		const user = await res.json();
		if ("error" in user) {
			throw redirect({
				to: "/login",
			});
		}
		const inventoryRes = await client.api.inventory.$get();

		if (inventoryRes.status !== 200) {
			throw new Error("Failed to fetch inventory details");
		}

		const { inventory } = await inventoryRes.json();
		// console.log(inventory);

		return { inventory };
	},
	component: InventoryPage,
});

function InventoryPage() {
	const { inventory } = Route.useLoaderData();

	const [inventoryQuery, setInventoryQuery] = useState<string>("");
	const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
	const [filterMode, setFilterMode] = useState<
		"all" | "lowStock" | "nearExpiry" | "expired"
	>("all");

	const toggleRow = (id: number) => {
		const newSet = new Set(expandedRows);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		setExpandedRows(newSet);
	};

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

	const [isOpenAddBatch, setIsOpenAddBatch] = useState<boolean>(false);
	const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(
		null,
	);

	const openAddBatch = (selectedMedicine: Medicine) => {
		setSelectedMedicine(selectedMedicine);
		setIsOpenAddBatch(true);
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

	const filteredInventory = getFilteredByMode(inventory)
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
		.sort((a, b) => b.count - a.count);

	const finalInventory = filteredInventory.map((f) => f.inventoryItem);

	useEffect(() => {
		if (inventoryQuery.trim() === "") {
			setExpandedRows(new Set());
			return;
		}

		const matched = new Set(finalInventory.map((f) => f.id));
		setExpandedRows(matched);
	}, [inventoryQuery, finalInventory]);

	return (
		<>
			<TopBar title="Inventory Dashboard" />
			<div className="mx-6 my-2.5 flex items-center justify-between">
				<h1 className="text-3xl font-bold">Medicine Inventory</h1>
				<div className="flex items-center w-full max-w-xl">
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
								<TableHead>Total Quantity</TableHead>
								<TableHead>Quick Actions</TableHead>
							</TableRow>
						</TableHeader>

						<TableBody>
							{finalInventory.map((item) => (
								<React.Fragment key={item.id}>
									<TableRow>
										<TableCell
											onClick={() => toggleRow(item.id)}
											className="cursor-pointer"
										>
											<div className="flex flex-wrap">
												<span className="font-semibold">
													{item.medicine.company} {item.medicine.brand}
												</span>
												<span className="mx-1 text-muted-foreground text-right">
													({item.medicine.drug}) - {item.medicine.strength} -{" "}
													{item.medicine.type}
												</span>
												{expandedRows.has(item.id) ? (
													<ChevronRight className="w-5 h-5" />
												) : (
													<ChevronDown className="w-5 h-5" />
												)}
											</div>
										</TableCell>
										<TableCell>{item.quantity}</TableCell>
										<TableCell className="flex space-x-2">
											<Button
												className="flex-1 w-full"
												onClick={() => openAddBatch(item.medicine)}
											>
												Add Batch
											</Button>
										</TableCell>
									</TableRow>

									{expandedRows.has(item.id) && (
										<>
											<TableRow className="bg-gray-100">
												<TableCell className="font-semibold">
													Batch ID
												</TableCell>
												<TableCell className="font-semibold">
													Quantity
												</TableCell>
												<TableCell className="font-semibold">
													Quick Actions
												</TableCell>
											</TableRow>

											{item.batches.map((batch) => (
												<TableRow key={batch.id}>
													<TableCell>{batch.batchNum}</TableCell>
													<TableCell>{batch.quantity}</TableCell>
													<TableCell className="flex space-x-2">
														<Button
															className="flex-1 w-full"
															onClick={() =>
																openDispense(batch.id, batch.batchNum)
															}
														>
															Dispense
														</Button>
														<Button
															className="flex-1 w-full"
															onClick={() =>
																openAddQuantity(batch.id, batch.batchNum)
															}
														>
															Add Quantity
														</Button>
													</TableCell>
												</TableRow>
											))}
										</>
									)}
								</React.Fragment>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
			<AddBatchModal
				open={isOpenAddBatch}
				onOpenChange={setIsOpenAddBatch}
				medicine={selectedMedicine}
			/>
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
