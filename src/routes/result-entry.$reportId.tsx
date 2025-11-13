import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import { z } from "zod";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { client } from "./api/$";

const ResultEntryDataSchema = z.object({
	success: z.boolean(),
	report: z.object({
		reportId: z.number(),
		caseId: z.number(),
		type: z.string(),
		results: z.record(z.string(), z.any()).nullable(),
		patientName: z.string(),
		doctorName: z.string(),
	}),
});

const INITIAL_RESULTS = {
	rbc_count: null,
	platelet_count: null,
	wbc_count: null,
	glucose: null,
	haemoglobin: null,
	creatinine: null,
};

export const Route = createFileRoute("/result-entry/$reportId")({
	loader: async ({ params }: { params: { reportId: string } }) => {
		const res = await client.api.lab.details[":reportId"].$get({
			param: { reportId: params.reportId },
		});

		if (res.status === 404) {
			throw redirect({ to: "/lab-dashboard" });
		}

		if (res.status === 401) {
			throw redirect({ to: "/login" });
		}

		if (!res.ok) {
			throw new Error("Failed to fetch report details");
		}

		const json = await res.json();
		const data = ResultEntryDataSchema.parse(json);
		return data.report;
	},
	component: ResultEntry,
});

function ResultEntry() {
	const navigate = useNavigate();
	const reportData = Route.useLoaderData();
	const {
		reportId,
		caseId,
		patientName,
		doctorName,
		results: initialResults,
	} = reportData;

	const [fileId, setFileId] = useState<number | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const rbcCountId = useId();
	const plateletCountId = useId();
	const wbcCountId = useId();
	const glucoseId = useId();
	const haemoglobinId = useId();
	const creatinineId = useId();
	const fileInputId = useId();

	const [labResults, setLabResults] = useState<typeof INITIAL_RESULTS>({
		...INITIAL_RESULTS,
		...initialResults,
	});

	const isDirty = useMemo(() => {
		return JSON.stringify(labResults) !== JSON.stringify(initialResults);
	}, [labResults, initialResults]);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSelectedFile(e.target.files?.[0] || null);
		setFileId(null);
	};

	const handleUpload = async () => {
		if (!selectedFile) return;

		setUploading(true);
		try {
			const res = await client.api.lab["upload-report-file"].$post({
				form: {
					file: selectedFile,
					reportId: reportId.toString(),
				},
			});

			if (!res.ok) {
				const errorData = await res
					.json()
					.catch(() => ({ error: "Unknown network error" }));
				if ("error" in errorData) {
					alert(
						"Upload failed: " +
							(errorData.error || res.statusText || "Unknown error"),
					);
				} else {
					alert(`Upload failed: ${res.statusText || "Unknown error"}`);
				}
				return;
			}

			const data = await res.json();

			if (data.success && data.file?.id) {
				console.log("File uploaded successfully, ID:", data.file.id);
				setFileId(data.file.id);
				alert(
					`File uploaded successfully with ID: ${data.file.id}. Ready for submission.`,
				);
			} else {
				alert("Upload failed: Server returned an unexpected response.");
			}
		} catch (error) {
			console.error("Upload error:", error);
			alert(`Upload failed: ${String(error)}`);
		} finally {
			setUploading(false);
		}
	};

	const handleSubmit = async () => {
		if (isSubmitting) return;

		const hasData =
			Object.values(labResults).some((v) => v !== null && v !== "") || fileId;

		if (!hasData) {
			alert("Please enter results or upload a report before submitting.");
			return;
		}

		setIsSubmitting(true);
		try {
			const res = await client.api.lab.submit[":reportId"].$post({
				param: { reportId: reportId.toString() },
				json: {
					fileId: fileId ?? undefined,
					resultsData: labResults,
				},
			});

			if (res.ok) {
				alert("Lab report finalized and sent to doctor!");
				navigate({ to: "/lab-dashboard" });
			} else {
				alert("Submission failed: Could not finalize report.");
			}
		} catch (error) {
			console.error("Submission error:", error);
			alert(`Submission failed: ${String(error)}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleResultChange = (
		key: keyof typeof INITIAL_RESULTS,
		value: string,
	) => {
		setLabResults((prev: typeof INITIAL_RESULTS) => ({
			...prev,
			[key]: value === "" ? null : value,
		}));
	};

	return (
		<>
			<TopBar title={`Lab Result Entry: ${patientName}`} />
			<div className="min-h-screen w-full p-8">
				<div className="max-w-4xl mx-auto bg-transparent">
					<div className="flex justify-between items-center mb-6">
						<h1 className="text-3xl font-bold">Result Entry</h1>
						<Button
							onClick={() => alert("Printing not implemented yet")}
							disabled={isSubmitting || !reportData.results}
						>
							Print Report
						</Button>
					</div>

					<Card className="mb-6">
						<CardHeader>
							<CardTitle>Patient Details</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-4">
							<div className="flex-1 min-w-[200px]">
								<Label className="font-semibold text-sm">Case ID</Label>
								<div className="border rounded-md bg-muted text-sm px-3 py-2 mt-1">
									{caseId}
								</div>
							</div>
							<div className="flex-1 min-w-[200px]">
								<Label className="font-semibold text-sm">Patient Name</Label>
								<div className="border rounded-md bg-muted text-sm px-3 py-2 mt-1">
									{patientName}
								</div>
							</div>
							<div className="flex-1 min-w-[200px]">
								<Label className="font-semibold text-sm">Doctor Name</Label>
								<div className="border rounded-md bg-muted text-sm px-3 py-2 mt-1">
									{doctorName}
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="mb-6">
						<CardHeader>
							<CardTitle>Lab Results</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor={rbcCountId}>RBC Count</Label>
									<Input
										id={rbcCountId}
										type="text"
										value={labResults.rbc_count || ""}
										onChange={(e) =>
											handleResultChange("rbc_count", e.target.value)
										}
										placeholder="Enter RBC count"
									/>
								</div>
								<div>
									<Label htmlFor={plateletCountId}>Platelet Count</Label>
									<Input
										id={plateletCountId}
										type="text"
										value={labResults.platelet_count || ""}
										onChange={(e) =>
											handleResultChange("platelet_count", e.target.value)
										}
										placeholder="Enter platelet count"
									/>
								</div>
								<div>
									<Label htmlFor={wbcCountId}>WBC Count</Label>
									<Input
										id={wbcCountId}
										type="text"
										value={labResults.wbc_count || ""}
										onChange={(e) =>
											handleResultChange("wbc_count", e.target.value)
										}
										placeholder="Enter WBC count"
									/>
								</div>
								<div>
									<Label htmlFor={glucoseId}>Glucose</Label>
									<Input
										id={glucoseId}
										type="text"
										value={labResults.glucose || ""}
										onChange={(e) =>
											handleResultChange("glucose", e.target.value)
										}
										placeholder="Enter glucose level"
									/>
								</div>
								<div>
									<Label htmlFor={haemoglobinId}>Haemoglobin</Label>
									<Input
										id={haemoglobinId}
										type="text"
										value={labResults.haemoglobin || ""}
										onChange={(e) =>
											handleResultChange("haemoglobin", e.target.value)
										}
										placeholder="Enter haemoglobin level"
									/>
								</div>
								<div>
									<Label htmlFor={creatinineId}>Creatinine</Label>
									<Input
										id={creatinineId}
										type="text"
										value={labResults.creatinine || ""}
										onChange={(e) =>
											handleResultChange("creatinine", e.target.value)
										}
										placeholder="Enter creatinine level"
									/>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="mb-6">
						<CardHeader>
							<CardTitle>Upload Files</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center gap-2">
								<Label
									htmlFor={fileInputId}
									className="hover:bg-primary w-fit transition p-3 rounded-md font-semibold border duration-300 ease-in-out cursor-pointer hover:text-primary-foreground"
								>
									Select File
								</Label>
								{selectedFile ? `${selectedFile.name}` : ""}
								<Input
									id={fileInputId}
									type="file"
									onChange={handleFileChange}
									accept=".pdf,.jpg,.jpeg,.png"
									className="hidden"
								></Input>
							</div>
							<Button
								onClick={handleUpload}
								disabled={!selectedFile || uploading}
							>
								{uploading ? "Uploading..." : "Upload"}
							</Button>
							{fileId && (
								<p className="text-sm text-green-600">
									File uploaded successfully (ID: {fileId})
								</p>
							)}
						</CardContent>
					</Card>

					<div className="flex justify-end gap-4">
						<Button
							variant="outline"
							onClick={() => navigate({ to: "/lab-dashboard" })}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							onClick={handleSubmit}
							disabled={isSubmitting || (!isDirty && !fileId)}
						>
							{isSubmitting ? "Submitting..." : "Submit Results"}
						</Button>
					</div>
				</div>
			</div>
		</>
	);
}
