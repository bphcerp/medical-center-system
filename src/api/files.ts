import { eq } from "drizzle-orm";
import { z } from "zod";
import { filesTable } from "@/db/files";
import env from "@/lib/env";
import { SeaweedFSClient } from "@/lib/seaweedfs";
import { createStrictHono, strictValidator } from "@/lib/types/api";
import { db } from "./index";

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

const app = createStrictHono().get(
	"/get/:id",
	strictValidator(
		"param",
		z.object({
			id: z.coerce.number().int().positive(),
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
			return c.json(
				{ success: false, error: { message: "File not found" } },
				404,
			);
		}

		if (!file.allowed.includes(userId)) {
			return c.json(
				{ success: false, error: { message: "Access forbidden" } },
				403,
			);
		}

		const fileResponse = await fetch(file.url);

		if (!fileResponse.body) {
			console.error(`Fetched file from storage but body was null`);
			return c.json(
				{
					success: false,
					error: {
						message: "Failed to retrieve file content",
						details: {
							url: file.url,
							status: fileResponse.status,
							statusText: fileResponse.statusText,
						},
					},
				},
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
