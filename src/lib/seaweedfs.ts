export class SeaweedFSClient {
	private masterUrl: string;

	constructor(masterUrl: string) {
		this.masterUrl = masterUrl;
	}

	async assignFileId(): Promise<{
		fid: string;
		url: string;
		publicUrl: string;
	}> {
		const response = await fetch(`${this.masterUrl}/dir/assign`);
		if (!response.ok) {
			throw new Error("Failed to assign file ID from SeaweedFS");
		}
		const data = await response.json();
		return {
			fid: data.fid,
			url: `http://${data.url}`,
			publicUrl: `http://${data.publicUrl}`,
		};
	}

	async uploadFile(file: File): Promise<{ fid: string; url: string }> {
		const assignment = await this.assignFileId();

		const formData = new FormData();
		formData.append("file", file);

		const response = await fetch(`${assignment.url}/${assignment.fid}`, {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			throw new Error("Failed to upload file to SeaweedFS volume");
		}

		return {
			fid: assignment.fid,
			url: `${assignment.publicUrl}/${assignment.fid}`,
		};
	}

	async deleteFile(fid: string): Promise<void> {
		const response = await fetch(
			`${this.masterUrl}/dir/lookup?volumeId=${fid.split(",")[0]}`,
		);
		if (!response.ok) {
			throw new Error("Failed to lookup file location");
		}

		const data = await response.json();
		if (!data.locations || data.locations.length === 0) {
			throw new Error("File location not found");
		}

		const volumeUrl = `http://${data.locations[0].url}`;
		const deleteResponse = await fetch(`${volumeUrl}/${fid}`, {
			method: "DELETE",
		});

		if (!deleteResponse.ok) {
			throw new Error("Failed to delete file from SeaweedFS volume");
		}
	}
}
