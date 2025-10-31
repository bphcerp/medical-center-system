import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { client } from "./api/$";

export const Route = createFileRoute("/result-entry")({
	component: ResultEntry,
});

function ResultEntry() {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);

	const handleUpload = async () => {
		if (!selectedFile) return;

		setUploading(true);
		try {
			const file = new File([selectedFile], selectedFile.name, {
				type: selectedFile.type,
			});

			const res = await client.api.files.upload.$post({
				form: {
					file: file,
				},
			});

			const data = await res.json();

			if (res.ok && data.success) {
				alert("File uploaded successfully!");
				setSelectedFile(null);
				const fileInput = document.getElementById(
					"file-upload",
				) as HTMLInputElement;
				if (fileInput) fileInput.value = "";
			} else {
				alert("Upload failed: " + (data.error || "Unknown error"));
			}
		} catch (error) {
			console.error("Upload error:", error);
			alert("Upload failed: " + String(error));
		} finally {
			setUploading(false);
		}
	};

	const handleViewFile = () => {
		if (selectedFile) {
			const fileURL = URL.createObjectURL(selectedFile);
			window.open(fileURL, "_blank");
		}
	};

	return (
		<div className="min-h-screen w-full p-8">
			<div className="max-w-4xl mx-auto bg-transparent">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-3xl font-bold">Result Entry</h1>
					<Button onClick={handleViewFile} disabled={!selectedFile}>
						Print Report
					</Button>
				</div>

				<div className="mb-4 space-y-2 text-lg">
					<p>
						<strong>Case ID:</strong> 12345
					</p>
					<p>
						<strong>Patient Name:</strong> John Doe
					</p>
					<p>
						<strong>Doctor:</strong> Dr. Smith
					</p>
				</div>

				<Card className="mb-6">
					<CardHeader>
						<CardTitle>Test: Blood Routine</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
							<div className="space-y-4">
								<div className="grid grid-cols-3 items-center gap-4">
									<Label className="text-right">RBC Count</Label>
									<Input readOnly className="col-span-2" />
								</div>
								<div className="grid grid-cols-3 items-center gap-4">
									<Label className="text-right">Platelet Count</Label>
									<Input id="platelet" readOnly className="col-span-2" />
								</div>
								<div className="grid grid-cols-3 items-center gap-4">
									<Label className="text-right">WBC Count</Label>
									<Input readOnly className="col-span-2" />
								</div>
							</div>

							<div className="space-y-4">
								<div className="grid grid-cols-3 items-center gap-4">
									<Label className="text-right">Glucose</Label>
									<Input readOnly className="col-span-2" />
								</div>
								<div className="grid grid-cols-3 items-center gap-4">
									<Label className="text-right">Haemoglobin</Label>
									<Input readOnly className="col-span-2" />
								</div>
								<div className="grid grid-cols-3 items-center gap-4">
									<Label className="text-right">Creatinine</Label>
									<Input readOnly className="col-span-2" />
								</div>
							</div>
						</div>

						<div className="flex justify-end items-center gap-4 mt-8">
							<div className="flex items-center gap-2">
								<Input
									id="file-upload"
									type="file"
									onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
									className="max-w-xs"
								/>
								<Button
									type="button"
									onClick={handleUpload}
									disabled={!selectedFile || uploading}
								>
									{uploading ? "Uploading..." : "Upload Report (Optional)"}
								</Button>
							</div>

							<Button variant="secondary" disabled>
								Send to Doctor
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Test: Liver Function</CardTitle>
					</CardHeader>
					<CardContent>
						<Textarea
							readOnly
							rows={8}
							placeholder="Enter liver function test results here..."
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
