import { zValidator } from "@hono/zod-validator";
import { and, eq, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
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
			.leftJoin(
				batchesTable,
				eq(batchesTable.medicineId, inventoryMedicinesTable.id),
			)
			.leftJoin(
				medicinesTable,
				eq(medicinesTable.id, inventoryMedicinesTable.medicine),
			);
		const inventoryMap = rows.reduce((acc, r) => {
			if (r.medicineId === null) {
				return acc;
			}
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
	})
	.get("/low_stock", async (c) => {
		const rows = await db
			.select({
				inventoryId: inventoryMedicinesTable.id,
				inventoryCriticalQty: inventoryMedicinesTable.criticalQty,

				medicineId: medicinesTable.id,
				drug: medicinesTable.drug,
				company: medicinesTable.company,
				brand: medicinesTable.brand,
				strength: medicinesTable.strength,
				type: medicinesTable.type,
				price: medicinesTable.price,

				batchId: batchesTable.id,
				batchNum: batchesTable.batchNum,
				batchExpiry: batchesTable.expiry,
				batchQuantity: batchesTable.quantity,
			})
			.from(inventoryMedicinesTable)
			.leftJoin(
				batchesTable,
				eq(batchesTable.medicineId, inventoryMedicinesTable.id),
			)
			.leftJoin(
				medicinesTable,
				eq(medicinesTable.id, inventoryMedicinesTable.medicine),
			);

		const inventoryMap = rows.reduce((acc, r) => {
			// Skip rows where medicine data is null
			if (r.medicineId === null) {
				return acc;
			}

			if (!acc.has(r.inventoryId)) {
				acc.set(r.inventoryId, {
					id: r.inventoryId,
					criticalQty: r.inventoryCriticalQty,
					quantity: 0,
					medicine: {
						id: r.medicineId,
						drug: r.drug!,
						company: r.company!,
						brand: r.brand!,
						strength: r.strength!,
						type: r.type!,
						price: r.price!,
					},
					batches: [],
				});
			}

			if (r.batchId !== null) {
				const item = acc.get(r.inventoryId)!;
				item.batches.push({
					id: r.batchId,
					batchNum: r.batchNum!,
					expiry: r.batchExpiry!,
					quantity: r.batchQuantity!,
				});
				item.quantity += r.batchQuantity!;
			}

			return acc;
		}, new Map<number, InventoryItem>());

		const lowStockItems = Array.from(inventoryMap.values()).filter(
			(item) => item.criticalQty !== null && item.quantity <= item.criticalQty,
		);

		return c.json({ inventory: lowStockItems });
	})
	.get("/near_expiry", async (c) => {
		const now = new Date();
		const threshold = new Date();
		threshold.setDate(now.getDate() + 30);

		const rows = await db
			.select({
				batchId: batchesTable.id,
				batchNum: batchesTable.batchNum,
				expiry: batchesTable.expiry,
				quantity: batchesTable.quantity,
				medicineId: medicinesTable.id,
				drug: medicinesTable.drug,
				company: medicinesTable.company,
				brand: medicinesTable.brand,
				strength: medicinesTable.strength,
				type: medicinesTable.type,
				price: medicinesTable.price,
			})
			.from(batchesTable)
			.leftJoin(medicinesTable, eq(medicinesTable.id, batchesTable.medicineId));

		const nearExpiryItems = rows.filter((r) => {
			if (r.medicineId === null) return false;
			const expiryDate = new Date(r.expiry);
			return expiryDate <= threshold;
		});

		return c.json({ inventory: nearExpiryItems });
	})
	.post(
		"addQuantity",
		zValidator(
			"json",
			z.object({
				batchId: z.number().int(),
				quantity: z.number().int().positive(),
			}),
		),
		async (c) => {
			const { batchId, quantity } = c.req.valid("json");

			await db.transaction(async (tx) => {
				const updated = await tx
					.update(batchesTable)
					.set({
						quantity: sql`${batchesTable.quantity} + ${quantity}`,
					})
					.where(eq(batchesTable.id, batchId))
					.returning();

				if (updated.length === 0) {
					throw new Error("Batch not found");
				}
			});

			return c.json({
				success: true,
				message: "Quantity added successfully",
			});
		},
	)
	.post(
		"dispense",
		zValidator(
			"json",
			z.object({
				batchId: z.number().int(),
				quantity: z.number().int().positive(),
			}),
		),
		async (c) => {
			const { batchId, quantity } = c.req.valid("json");

			await db.transaction(async (tx) => {
				const updated = await tx
					.update(batchesTable)
					.set({
						quantity: sql`${batchesTable.quantity} - ${quantity}`,
					})
					.where(
						and(
							eq(batchesTable.id, batchId),
							gte(batchesTable.quantity, quantity),
						),
					)
					.returning();

				if (updated.length === 0) {
					throw new Error("Not enough quantity in stock or batch not found");
				}
			});

			return c.json({
				success: true,
				message: "Quantity dispensed successfully",
			});
		},
	);

export default inventory;
