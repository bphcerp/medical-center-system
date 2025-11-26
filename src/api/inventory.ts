import { and, eq, gte, sql } from "drizzle-orm";
import z from "zod";
import { medicinesTable } from "@/db/case";
import { batchesTable, inventoryMedicinesTable } from "@/db/inventory";
import { createStrictHono, strictValidator } from "@/lib/types/api";
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

const inventory = createStrictHono()
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
			.innerJoin(
				medicinesTable,
				eq(medicinesTable.id, inventoryMedicinesTable.medicineId),
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

			if (
				r.batchId !== null &&
				r.batchNum !== null &&
				r.batchExpiry !== null &&
				r.batchQuantity !== null
			) {
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

		return c.json({
			success: true,
			data: Array.from(inventoryMap.values()),
		});
	})
	.get("/medicines", async (c) => {
		const medicines = await db.select().from(medicinesTable);

		if (medicines.length === 0) {
			return c.json(
				{ success: false, error: { message: "Medicines data not found" } },
				404,
			);
		}

		return c.json({ success: true, data: medicines });
	})
	.post(
		"/addQuantity",
		strictValidator(
			"json",
			z.object({
				batchId: z.number().int().positive(),
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
				data: {
					message: "Quantity added successfully",
				},
			});
		},
	)
	.post(
		"/dispense",
		strictValidator(
			"json",
			z.object({
				batchId: z.number().int().positive(),
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
				data: {
					message: "Quantity dispensed successfully",
				},
			});
		},
	)
	.post(
		"/batch",
		strictValidator(
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
			if (new Date(expiry) <= new Date()) {
				return c.json(
					{ success: false, error: { message: "Expiry date is in the past" } },
					400,
				);
			}

			const [duplicateBatch] = await db
				.select()
				.from(batchesTable)
				.where(eq(batchesTable.batchNum, batchNum));

			if (duplicateBatch) {
				return c.json(
					{ success: false, error: { message: "Duplicate batch" } },
					400,
				);
			}

			await db.insert(batchesTable).values({
				medicineId,
				batchNum,
				expiry,
				quantity,
			});

			return c.json({
				success: true,
				data: { message: "Batch added successfully" },
			});
		},
	)
	.post(
		"/changeCriticalQty",
		strictValidator(
			"json",
			z.object({
				medicineId: z.number().int().positive(),
				criticalQty: z.number().int().nonnegative(),
			}),
		),
		async (c) => {
			// TODO: Is a 0 critical quantity allowed? Should we change it to null instead?
			const { medicineId, criticalQty } = c.req.valid("json");

			const updated = await db
				.update(inventoryMedicinesTable)
				.set({ criticalQty })
				.where(eq(inventoryMedicinesTable.medicineId, medicineId))
				.returning();

			if (updated.length === 0) {
				return c.json(
					{ success: false, error: { message: "Medicines data not found" } },
					404,
				);
			}
			return c.json({
				success: true,
				data: {
					message: "Critical quantity updated successfully",
				},
			});
		},
	)
	.post(
		"/addMedicines",
		strictValidator(
			"json",
			z.object({
				medicines: z
					.array(
						z.object({
							id: z.number().int().positive(),
						}),
					)
					.min(1),
			}),
		),
		async (c) => {
			const { medicines } = c.req.valid("json");

			await db.transaction(async (tx) => {
				for (const item of medicines) {
					await tx
						.insert(inventoryMedicinesTable)
						.values({
							medicineId: item.id,
							criticalQty: 0,
						})
						.onConflictDoNothing();
				}
			});

			return c.json({
				success: true,
				data: { message: "Medicines added successfully" },
			});
		},
	)
	.delete(
		"/medicine",
		strictValidator(
			"json",
			z.object({
				inventoryMedicineId: z.number().int().positive(),
			}),
		),
		async (c) => {
			const { inventoryMedicineId } = c.req.valid("json");

			const deleted = await db
				.delete(inventoryMedicinesTable)
				.where(eq(inventoryMedicinesTable.id, inventoryMedicineId))
				.returning();

			if (deleted.length === 0) {
				return c.json(
					{ success: false, error: { message: "Medicine not found" } },
					404,
				);
			}

			return c.json({
				success: true,
				data: {
					message: "Medicine deleted successfully",
				},
			});
		},
	);

export default inventory;
