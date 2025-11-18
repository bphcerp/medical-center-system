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
		expiry: string;
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
	)
	.post(
		"batch",
		zValidator(
			"json",
			z.object({
				medicineId: z.number().int().positive(),
				batchNum: z.string().min(1),
				expiry: z.iso.date(),
				quantity: z.number().int().positive(),
			}),
		),
		async (c) => {
			const { medicineId, batchNum, expiry, quantity } = c.req.valid("json");

			try {
				await db.transaction(async (tx) => {
					const [medicine] = await tx
						.select()
						.from(inventoryMedicinesTable)
						.where(eq(inventoryMedicinesTable.id, medicineId));

					if (!medicine) {
						throw new Error("MEDICINE_NOT_FOUND");
					}

					const [duplicateBatch] = await tx
						.select()
						.from(batchesTable)
						.where(eq(batchesTable.batchNum, batchNum));

					if (duplicateBatch) {
						throw new Error("DUPLICATE_BATCH");
					}

					await tx.insert(batchesTable).values({
						medicineId,
						batchNum,
						expiry,
						quantity,
					});
				});
			} catch (error: unknown) {
				let message: string = "";
				if (error instanceof Error) message = error.message;
				if (message === "MEDICINE_NOT_FOUND") {
					return c.json({ success: false, error: "Medicine not found" }, 404);
				}

				if (message === "DUPLICATE_BATCH") {
					return c.json({ success: false, error: "Duplicate batch" }, 400);
				}

				throw error;
			}
			return c.json({
				success: true,
				message: "Batch added successfully",
			});
		},
	);

export default inventory;
