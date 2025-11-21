import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { filesTable } from "@/db/files";
import env from "@/lib/env";
import { SeaweedFSClient } from "@/lib/seaweedfs";
import { db } from "./index";
import { rbacCheck } from "./rbac";

export async function uploadFileService(file: File, allowed: number[] = []) {
	const { fid, url } = await seaweedfs.uploadFile(file);

	try {
		const [fileRecord] = await db
			.insert(filesTable)
			.values({
				url: url,
				allowed: allowed,
			})
			.returning({
				id: filesTable.id,
				url: filesTable.url,
			});

		if (!fileRecord) {
			throw new Error("Failed to insert file record");
		}

		return { ...fileRecord, fid, filename: file.name };
	} catch (error) {
		// Clean up orphaned file in SeaweedFS
		await seaweedfs.deleteFile(fid).catch(console.error);
		throw error;
	}
}

export const seaweedfs = new SeaweedFSClient(env.SEAWEEDFS_MASTER);

const app = new Hono()
	.get("/list", rbacCheck({ permissions: ["admin"] }), async (c) => {
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
		rbacCheck({ permissions: ["admin"] }),
		zValidator("param", z.object({ id: z.coerce.number() })),
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
			return c.json({
				success: true,
				file: { id: file.id, url: `/api/files/get/${file.id}` },
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
			const payload = c.var.jwtPayload as {
				id: number;
				[key: string]: unknown;
			};
			const userId = payload.id;

			const [file] = await db
				.select()
				.from(filesTable)
				.where(eq(filesTable.id, id))
				.limit(1);

			if (!file) {
				return c.json({ success: false, error: "File not found" }, 404);
			}

			if (!file.allowed.includes(userId)) {
				return c.json({ success: false, error: "Access forbidden" }, 403);
			}

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
	);

export default app;
