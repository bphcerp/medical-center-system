import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import env from "@/config/env";
import { db } from "./index";
import { filesTable } from "@/db/files";
import { SeaweedFSClient } from "@/lib/seaweedfs";

const app = new Hono();
const seaweedfs = new SeaweedFSClient(env.SEAWEEDFS_MASTER);

app.post(
	"/upload",
	zValidator(
		"form",
		z.object({
			file: z.instanceof(File),
		}),
	),
	async (c) => {
		try {
			const { file } = c.req.valid("form");

			console.log("Uploading file:", {
				name: file.name,
				size: file.size,
				type: file.type,
			});

			const { fid } = await seaweedfs.uploadFile(file);

			const [fileRecord] = await db
				.insert(filesTable)
				.values({
					seaweed_fileid: fid,
				})
				.returning();

			const publicUrl = `${env.SEAWEEDFS_VOLUME_URL}/${fid}`;

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
		} catch (error) {
			console.error("File upload error:", error);
			return c.json(
				{
					success: false,
					error:
						error instanceof Error ? error.message : "Failed to upload file",
				},
				500,
			);
		}
	},
);

app.get("/list", async (c) => {
	try {
		const files = await db.select().from(filesTable);

		return c.json({
			success: true,
			files: files.map((file) => ({
				id: file.id,
				fid: file.seaweed_fileid,
				url: `${env.SEAWEEDFS_VOLUME_URL}/${file.seaweed_fileid}`,
			})),
		});
	} catch (error) {
		console.error("File list error:", error);
		return c.json(
			{
				success: false,
				error: "Failed to list files",
			},
			500,
		);
	}
});

app.get(
	"/info/:id",
	zValidator(
		"param",
		z.object({
			id: z.coerce.number(),
		}),
	),
	async (c) => {
		try {
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
					fid: file.seaweed_fileid,
					url: `${env.SEAWEEDFS_VOLUME_URL}/${file.seaweed_fileid}`,
				},
			});
		} catch (error) {
			console.error("File info error:", error);
			return c.json(
				{
					success: false,
					error: "Failed to get file info",
				},
				500,
			);
		}
	},
);

app.delete(
	"/:id",
	zValidator(
		"param",
		z.object({
			id: z.coerce.number(),
		}),
	),
	async (c) => {
		try {
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

			await seaweedfs.deleteFile(file.seaweed_fileid);

			await db.delete(filesTable).where(eq(filesTable.id, id));

			return c.json({
				success: true,
				message: "File deleted successfully",
			});
		} catch (error) {
			console.error("File deletion error:", error);
			return c.json(
				{
					success: false,
					error: "Failed to delete file",
				},
				500,
			);
		}
	},
);

export default app;
