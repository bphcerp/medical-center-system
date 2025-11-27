import { eq } from "drizzle-orm";
import { z } from "zod";
import { filesTable } from "@/db/files";
import env from "@/lib/env";
import { SeaweedFSClient } from "@/lib/seaweedfs";
import { createStrictHono, strictValidator } from "@/lib/types/api";
import { db } from "./index";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function uploadFileService(
	tx: Transaction,
	file: File,
	allowed: number[] = [],
) {
	const { fid, url } = await seaweedfs.uploadFile(file);
	try {
		const [fileRecord] = await tx
			.insert(filesTable)
			.values({
				url: url,
				fid: fid,
				filename: file.name,
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
		console.error("Error uploading file record to DB:", error);
		await seaweedfs.deleteFile(fid);
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
		const payload = c.get("jwtPayload");
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

		if (
			!file.allowed.includes(userId) &&
			!payload.role.allowed.includes("lab")
		) {
			return c.json(
				{ success: false, error: { message: "Access forbidden" } },
				403,
			);
		}

		const fileResponse = await fetch(file.url);

		if (!fileResponse.body) {
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
