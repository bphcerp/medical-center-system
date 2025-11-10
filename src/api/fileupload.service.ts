import { filesTable } from "@/db/files";
import { seaweedfs } from "./files";
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
