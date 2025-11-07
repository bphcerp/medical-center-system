import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import env from "@/config/env";
import { db } from "./index";
import { filesTable } from "@/db/files";
import { SeaweedFSClient } from "@/lib/seaweedfs";

const seaweedfs = new SeaweedFSClient(env.SEAWEEDFS_MASTER);

const app = new Hono()
	.basePath("/files")
	.post(
		"/upload",
		zValidator(
			"form",
			z.object({
				file: z.instanceof(File),
			}),
		),
		async (c) => {
			const { file } = c.req.valid("form");

			console.log("Uploading file:", {
				name: file.name,
				size: file.size,
				type: file.type,
			});

			const { fid, url } = await seaweedfs.uploadFile(file);

			const [fileRecord] = await db
				.insert(filesTable)
				.values({
					url: url,
					// setup allowed array here
				})
				.returning();

			const publicUrl = `/api/files/get/${fileRecord.id}`;

			return c.json({
				success: true,
				file: {
					id: fileRecord.id,
					fid: fid,
					url: publicUrl,
					filename: file.name,
					size: file.size,
					type: file.type,
				},
			});
		},
	)
	.get("/list", async (c) => {
		const files = await db.select().from(filesTable);

		return c.json({
			success: true,
			files: files.map((file) => ({
				id: file.id,
				url: `/api/files/get/${file.id}`,
			})),
		});
	})
	.get(
		"/info/:id",
		zValidator(
			"param",
			z.object({
				id: z.coerce.number(),
			}),
		),
		async (c) => {
			const { id } = c.req.valid("param");

			const [file] = await db
				.select()
				.from(filesTable)
				.where(eq(filesTable.id, id))
				.limit(1);

			if (!file) {
				return c.json(
					{
						success: false,
						error: "File not found",
					},
					404,
				);
			}

			return c.json({
				success: true,
				file: {
					id: file.id,
					url: `/api/files/get/${file.id}`,
				},
			});
		},
	)
	.get(
		"/get/:id",
		zValidator(
			"param",
			z.object({
				id: z.coerce.number(),
			}),
		),
		async (c) => {
			const { id } = c.req.valid("param");

			const [file] = await db
				.select()
				.from(filesTable)
				.where(eq(filesTable.id, id))
				.limit(1);

			if (!file) {
				return c.json({ success: false, error: "File not found" }, 404);
			}

			// allowed check here

			const fileResponse = await fetch(file.url);

			if (!fileResponse.body) {
				console.error(`Fetched file from storage but body was null`);
				return c.json(
					{ success: false, error: "Failed to retrieve file content" },
					500,
				);
			}

			c.header(
				"Content-Type",
				fileResponse.headers.get("Content-Type") || "application/octet-stream",
			);
			c.header(
				"Content-Length",
				fileResponse.headers.get("Content-Length") || undefined,
			);

			if (fileResponse.body) return c.body(fileResponse.body);
		},
	)
	.delete(
		"/:id",
		zValidator(
			"param",
			z.object({
				id: z.coerce.number(),
			}),
		),
		async (c) => {
			const { id } = c.req.valid("param");

			const [file] = await db
				.select()
				.from(filesTable)
				.where(eq(filesTable.id, id))
				.limit(1);

			if (!file) {
				return c.json(
					{
						success: false,
						error: "File not found",
					},
					404,
				);
			}

			await seaweedfs.deleteFile(file.url);

			await db.delete(filesTable).where(eq(filesTable.id, id));

			return c.json({
				success: true,
				message: "File deleted successfully",
			});
		},
	);

export default app;
