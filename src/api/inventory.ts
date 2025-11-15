import { Hono } from "hono";
import { inventoryMedicinesTable , batchesTable } from "@/db/inventory";
import { db } from "./index";
import { eq } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import z from "zod";

const api = new Hono()
	api.get("/", async (c) => {
	// Step 1: join inventory with batches
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
		eq(batchesTable.medicineId, inventoryMedicinesTable.id)
		);

	// Step 2: group rows by inventory item
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

		// If a batch exists, add it
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
		},
	)

	// PUT — update quantity of an existing medicine
	.put(
		"/:id",
		zValidator(
			"param",
			z.object({
				id: z.coerce.number().int(),
			}),
		),
		zValidator(
			"json",
			z.object({
				quantity: z.number().int(),
			}),
		),
		async (c) => {
			const { id } = c.req.valid("param");
			const { quantity } = c.req.valid("json");

			const result = await db
				.update(inventoryMedicinesTable)
				.set({ quantity })
				.where(eq(inventoryMedicinesTable.id, id));

			if (result.rowCount === 0) {
				return c.json({ error: "Item not found" }, 404);
			}

			return c.json({ success: true, message: "Quantity updated." });
		},
	);

export default api;
