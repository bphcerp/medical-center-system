import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { medicinesTable } from "@/db/case";
import { batchesTable, inventoryMedicinesTable } from "@/db/inventory";
import { db } from "./index";
import { rbacCheck } from "./rbac";

type InventoryItem = {
	id: number;
	quantity: number;
	criticalQty: number | null;
	medicine: {
		id: number;
		drug: string;
		company: string;
		brand: string;
		strength: string;
		type: string;
		price: number;
	};
	batches: {
		id: number;
		batchNum: string;
		expiry: string; // TODO: Make compatible with Date
		quantity: number;
	}[];
};

const inventory = new Hono()
	.use(rbacCheck({ permissions: ["inventory"] }))
	.get("/", async (c) => {
		const rows = await db
			.select({
				inventoryId: inventoryMedicinesTable.id,
				inventoryCriticalQty: inventoryMedicinesTable.criticalQty,

				// Medicine details
				medicineId: medicinesTable.id,
				drug: medicinesTable.drug,
				company: medicinesTable.company,
				brand: medicinesTable.brand,
				strength: medicinesTable.strength,
				type: medicinesTable.type,
				price: medicinesTable.price,

				// Batch details
				batchId: batchesTable.id,
				batchNum: batchesTable.batchNum,
				batchExpiry: batchesTable.expiry,
				batchQuantity: batchesTable.quantity,
			})
			.from(inventoryMedicinesTable)
			.innerJoin(
				batchesTable,
				eq(batchesTable.medicineId, inventoryMedicinesTable.id),
			)
			.innerJoin(
				medicinesTable,
				eq(medicinesTable.id, inventoryMedicinesTable.medicine),
			);

		const inventoryMap = rows.reduce((acc, r) => {
			if (!acc.has(r.inventoryId)) {
				acc.set(r.inventoryId, {
					id: r.inventoryId,
					quantity: 0,
					criticalQty: r.inventoryCriticalQty,
					medicine: {
						id: r.medicineId,
						drug: r.drug,
						company: r.company,
						brand: r.brand,
						strength: r.strength,
						type: r.type,
						price: r.price,
					},
					batches: [],
				});
			}

			if (r.batchId !== null) {
				const item = acc.get(r.inventoryId);
				if (item) {
					item.batches.push({
						id: r.batchId,
						batchNum: r.batchNum,
						expiry: r.batchExpiry,
						quantity: r.batchQuantity,
					});
					item.quantity += r.batchQuantity;
				}
			}

			return acc;
		}, new Map<number, InventoryItem>());

		return c.json({ inventory: Array.from(inventoryMap.values()) });
	});

export default inventory;
