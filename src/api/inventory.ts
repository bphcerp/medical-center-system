import { Hono } from "hono";
import { inventoryMedicinesTable } from "@/db/inventory";
import { db } from "./index";
import { eq } from "drizzle-orm"; // used for WHERE conditions
import { zValidator } from "@hono/zod-validator"; // for input validation
import z from "zod";

const api = new Hono()

	// GET all medicines in inventory
	.get("/", async (c) => {
		const data = await db.select().from(inventoryMedicinesTable);
		return c.json({ inventory: data });
	})

	// POST — add a new inventory item
	.post(
		"/",
		zValidator(
			"json",
			z.object({
				medicine: z.number().int(),
				quantity: z.number().int(),
			}),
		),
		async (c) => {
			const { medicine, quantity } = c.req.valid("json");

			// Insert into database
			await db.insert(inventoryMedicinesTable).values({
				medicine,
				quantity,
			});

			return c.json({ success: true, message: "Item added to inventory." });
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
