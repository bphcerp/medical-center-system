import { createFileRoute, redirect } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import React, { useState } from "react";
import { AddQuantityModal } from "@/components/inventory-add-modal";
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
    return { inventory };
  },
  component: InventoryPage,
});

export async function getLowStock() {
  const res = await client.api.inventory.low_stock.$get();
  if (res.status !== 200) {
    throw new Error("Failed to fetch low stock inventory!");
  }
  const { inventory } = await res.json();
  return inventory;
}

function InventoryPage() {
  const { inventory } = Route.useLoaderData();

  type InventoryItem = (typeof inventory)[number];

  const [inventoryQuery, setInventoryQuery] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[] | null>(null);
  const [isLowStockLoading, setIsLowStockLoading] = useState(false);
  const [lowStockError, setLowStockError] = useState<string | null>(null);

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

  const handleLowStockClick = async () => {
    if (filteredInventory) {
      setFilteredInventory(null);
      setLowStockError(null);
      return;
    }

    setIsLowStockLoading(true);
    setLowStockError(null);

    try {
      const inventoryArray = await getLowStock();
      setFilteredInventory(inventoryArray);
    } catch (err: any) {
      console.error("Low stock fetch failed. ", err);
      setLowStockError(err?.message ?? "Failed to fetch low stock items.");
      setFilteredInventory(null);
    } finally {
      setIsLowStockLoading(false);
    }
  };

  const displayedInventory = filteredInventory ?? inventory;

  return (
    <>
      <TopBar title="Inventory Dashboard" />
      <div className="mx-6 my-2.5 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Medicine Inventory</h1>
        <div className="flex items-center w-full max-w-2xl">
          <Button
            className="mr-2"
            onClick={handleLowStockClick}
            disabled={isLowStockLoading}
            aria-pressed={!!filteredInventory}
            aria-busy={isLowStockLoading}
          >
            {isLowStockLoading ? "Loading…" : filteredInventory ? "Showing Low Stock (Clear)" : "Low Stock"}
          </Button>

          <Button className="mr-2">Near Expiry</Button>

          <Input
            type="text"
            placeholder="Search for inventory medicines here..."
            value={inventoryQuery}
            onChange={(e) => setInventoryQuery(e.target.value)}
          />
          <Button className="ml-2">Search</Button>
        </div>
      </div>

      {lowStockError && (
        <div className="mx-6 mb-2 text-sm text-red-600" role="alert">
          {lowStockError}
        </div>
      )}

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
              {displayedInventory.map((item) => (
                <React.Fragment key={item.id}>
                  <TableRow>
                    <TableCell onClick={() => toggleRow(item.id)} className="cursor-pointer">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                          {item.medicine.company} {item.medicine.brand}
                        </span>
                        <span className="mx-1 text-muted-foreground text-right">
                          ({item.medicine.drug}) - {item.medicine.strength} - {item.medicine.type}
                        </span>
                        {expandedRows.has(item.id) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </div>
                    </TableCell>

                    <TableCell>{item.quantity}</TableCell>

                    <TableCell className="flex space-x-2">
                      <Button className="flex-1 w-full">Add Batch</Button>
                    </TableCell>
                  </TableRow>

                  {expandedRows.has(item.id) && (
                    <>
                      <TableRow className="bg-gray-100">
                        <TableCell className="font-semibold">Batch ID</TableCell>
                        <TableCell className="font-semibold">Quantity</TableCell>
                        <TableCell className="font-semibold">Quick Actions</TableCell>
                      </TableRow>

                      {(item.batches ?? []).map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell>{batch.batchNum}</TableCell>
                          <TableCell>{batch.quantity}</TableCell>
                          <TableCell className="flex space-x-2">
                            <Button
                              className="flex-1 w-full"
                              onClick={() => openDispense(batch.id, batch.batchNum)}
                            >
                              Dispense
                            </Button>
                            <Button
                              className="flex-1 w-full"
                              onClick={() => openAddQuantity(batch.id, batch.batchNum)}
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
