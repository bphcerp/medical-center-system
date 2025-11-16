import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { client } from "./api/$";
import { statusEnums } from "@/db/lab";

const testSchema = z.object({
	labTestReportId: z.number(),
	testId: z.number(),
	testName: z.string(),
	status: z.enum(statusEnums),
	metadata: z.any().nullable(),
	fileId: z.number().nullable(),
});

const caseDetailsSchema = z.object({
	success: z.boolean(),
	caseId: z.number(),
	patientName: z.string(),
	doctorName: z.string(),
	tests: z.array(testSchema),
});

type TestUpdate = {
	labTestReportId: number;
	status: (typeof statusEnums)[number];
	fileId?: number;
};

export const Route = createFileRoute("/test-entry/$caseId")({
	loader: async ({ params }: { params: { caseId: string } }) => {
		const res = await client.api.lab.details[":caseId"].$get({
			param: { caseId: params.caseId },
		});

		if (res.status === 404) {
			throw redirect({ to: "/lab-dashboard" });
		}
		if (res.status === 401) {
			throw redirect({ to: "/login" });
		}
		if (!res.ok) {
			throw new Error("Failed to fetch case details");
		}

		const json = await res.json();
		const data = caseDetailsSchema.parse(json);
		return data;
	},
	component: TestEntry,
});

function TestEntry() {
	const navigate = useNavigate();
	const caseData = Route.useLoaderData();
	const { caseId, patientName, doctorName, tests: initialTests } = caseData;

	const [tests, setTests] = useState(initialTests);
	const [uploading, setUploading] = useState<Record<number, boolean>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "Requested":
				return "bg-yellow-100 text-yellow-800";
			case "Sample Collected":
				return "bg-blue-100 text-blue-800";
			case "Waiting For Report":
				return "bg-purple-100 text-purple-800";
			case "Complete":
				return "bg-green-100 text-green-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const handleCheckboxChange = (testId: number, checked: boolean) => {
		setTests((prev) =>
			prev.map((test) =>
				test.labTestReportId === testId
					? {
							...test,
							status: checked ? "Sample Collected" : "Requested",
						}
					: test,
			),
		);
	};

	const handleFileUpload = async (testId: number, file: File) => {
		setUploading((prev) => ({ ...prev, [testId]: true }));

		try {
			const res = await client.api.lab["upload-file"].$post({
				form: {
					file,
					labTestReportId: testId.toString(),
				},
			});

			if (!res.ok) {
				const errorData = await res
					.json()
					.catch(() => ({ error: "Unknown error" }));
				const message =
					(typeof errorData === "object" &&
						errorData !== null &&
						"error" in errorData &&
						(errorData as { error: string }).error) ||
					res.statusText ||
					"Unknown error";
				alert("Upload failed: " + message);
				return;
			}

			const data = await res.json();
			if (data.success && data.file?.id) {
				setTests((prev) =>
					prev.map((test) =>
						test.labTestReportId === testId
							? {
									...test,
									fileId: data.file.id,
									status: "Complete",
								}
							: test,
					),
				);
				alert(`File uploaded successfully!`);
			}
		} catch (error) {
			console.error("Upload error:", error);
			alert(`Upload failed: ${String(error)}`);
		} finally {
			setUploading((prev) => ({ ...prev, [testId]: false }));
		}
	};

	const handleSubmit = async () => {
		setIsSubmitting(true);

		// build updates for tests that have changed
		const updates: TestUpdate[] = [];

		for (const test of tests) {
			const original = initialTests.find(
				(t) => t.labTestReportId === test.labTestReportId,
			);
			if (
				!original ||
				original.status !== test.status ||
				original.fileId !== test.fileId
			) {
				updates.push({
					labTestReportId: test.labTestReportId,
					status: test.status,
					...(test.fileId && { fileId: test.fileId }),
				});
			}
		}

		if (updates.length === 0) {
			alert("No changes to submit");
			setIsSubmitting(false);
			return;
		}

		try {
			const res = await client.api.lab["update-tests"][":caseId"].$post({
				param: { caseId: caseId.toString() },
				json: { tests: updates },
			});

			if (res.ok) {
				alert("Tests updated successfully!");
				navigate({ to: "/lab-dashboard" });
			} else {
				const errorData = await res
					.json()
					.catch(() => ({ error: "Unknown error" }));
				const message =
					typeof errorData === "object" && errorData !== null
						? "error" in errorData &&
							typeof (errorData as any).error === "string"
							? (errorData as { error: string }).error
							: "message" in errorData &&
									typeof (errorData as any).message === "string"
								? (errorData as { message: string }).message
								: res.statusText || "Unknown error"
						: res.statusText || "Unknown error";
				alert(`Update failed: ${message}`);
			}
		} catch (error) {
			console.error("Submission error:", error);
			alert(`Submission failed: ${String(error)}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	const hasChanges = tests.some((test, idx) => {
		const original = initialTests[idx];
		return original.status !== test.status || original.fileId !== test.fileId;
	});

	return (
		<>
			<TopBar title="Test Entry" />
			<div className="container mx-auto p-6">
				<Card className="mb-6">
					<CardHeader>
						<CardTitle>Patient Details</CardTitle>
					</CardHeader>
					<CardContent className="grid grid-cols-3 gap-4">
						<div>
							<Label className="text-muted-foreground">Case ID</Label>
							<div className="font-medium">{caseId}</div>
						</div>
						<div>
							<Label className="text-muted-foreground">Patient Name</Label>
							<div className="font-medium">{patientName}</div>
						</div>
						<div>
							<Label className="text-muted-foreground">Doctor Name</Label>
							<div className="font-medium">{doctorName}</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Lab Tests</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-6">
							{tests.map((test) => (
								<div
									key={test.labTestReportId}
									className="border rounded-lg p-4"
								>
									<div className="flex items-start justify-between mb-3">
										<div className="flex items-center gap-3">
											<Checkbox
												id={`test-${test.labTestReportId}`}
												checked={test.status !== "Requested"}
												onCheckedChange={(checked) =>
													handleCheckboxChange(
														test.labTestReportId,
														checked as boolean,
													)
												}
											/>
											<Label
												htmlFor={`test-${test.labTestReportId}`}
												className="text-lg font-medium cursor-pointer"
											>
												{test.testName}
											</Label>
										</div>
										<Badge
											className={getStatusColor(test.status)}
											variant="secondary"
										>
											{test.status}
										</Badge>
									</div>

									{test.status !== "Requested" && (
										<div className="ml-8 space-y-2">
											<Label>Upload Report</Label>
											<div className="flex gap-2">
												<Input
													type="file"
													accept=".pdf,.jpg,.jpeg,.png"
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) {
															handleFileUpload(test.labTestReportId, file);
														}
													}}
													disabled={
														uploading[test.labTestReportId] || isSubmitting
													}
													className="flex-1"
												/>
												{test.fileId && (
													<Badge variant="outline" className="bg-green-50">
														File uploaded (ID: {test.fileId})
													</Badge>
												)}
											</div>
											{uploading[test.labTestReportId] && (
												<p className="text-sm text-muted-foreground">
													Uploading...
												</p>
											)}
										</div>
									)}
								</div>
							))}
						</div>

						<div className="flex justify-end gap-3 mt-6">
							<Button
								variant="outline"
								onClick={() => navigate({ to: "/lab-dashboard" })}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={!hasChanges || isSubmitting}
							>
								{isSubmitting ? "Updating..." : "Update Tests"}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</>
	);
}
