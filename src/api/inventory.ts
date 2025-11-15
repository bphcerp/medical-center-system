import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { batchesTable, inventoryMedicinesTable } from "@/db/inventory";
import { db } from "./index";

const api = new Hono();
api.get("/", async (c) => {
	const rows = await db
		.select({
			inv_id: inventoryMedicinesTable.id,
			inv_medicine: inventoryMedicinesTable.medicine,
			inv_quantity: inventoryMedicinesTable.quantity,
			batch_id: batchesTable.id,
			batch_num: batchesTable.batchNum,
			batch_expiry: batchesTable.expiry,
			batch_quantity: batchesTable.quantity,
		})
		.from(inventoryMedicinesTable)
		.leftJoin(
			batchesTable,
			eq(batchesTable.medicineId, inventoryMedicinesTable.id),
		);

	const map = new Map();

	for (const r of rows) {
		if (!map.has(r.inv_id)) {
			map.set(r.inv_id, {
				id: r.inv_id,
				medicine: r.inv_medicine,
				quantity: 0,
				batches: [],
			});
		}

		if (r.batch_id !== null) {
			const item = map.get(r.inv_id);
			map.get(r.inv_id).batches.push({
				id: r.batch_id,
				batchNum: r.batch_num,
				expiry: r.batch_expiry,
				quantity: r.batch_quantity,
			});
			item.quantity += r.batch_quantity;
		}
	}

	return c.json({ inventory: Array.from(map.values()) });
});

export default api;
