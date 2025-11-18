import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LabTestStatusBadge } from "@/components/lab-test-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { statusEnums } from "@/db/lab";
import { handleUnauthorized } from "@/lib/utils";
import { client } from "../api/$";

type TestUpdate = {
	labTestReportId: number;
	status: (typeof statusEnums)[number];
	fileId?: number;
};

export const Route = createFileRoute("/lab/$caseId")({
	loader: async ({ params: { caseId } }) => {
		const res = await client.api.lab.details[":caseId"].$get({
			param: { caseId },
		});
		handleUnauthorized(res.status);
		if (res.status === 404) {
			throw redirect({ to: "/lab" });
		}

		return await res.json();
	},
	component: TestEntry,
});

function TestEntry() {
	const navigate = useNavigate();
	const {
		caseId,
		patientName,
		doctorName,
		tests: initialTests,
	} = Route.useLoaderData();

	const [tests, setTests] = useState(initialTests);
	const [uploading, setUploading] = useState<Record<number, boolean>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => setTests(initialTests), [initialTests]);

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
				alert(`Upload failed: ${message}`);
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
				navigate({ to: "/lab" });
			} else {
				const errorData = await res
					.json()
					.catch(() => ({ error: "Unknown error" }));
				const message =
					typeof errorData === "object" && errorData !== null
						? "error" in errorData &&
							typeof (errorData as { error?: string }).error === "string"
							? (errorData as { error: string }).error
							: "message" in errorData &&
									typeof (errorData as { message?: string }).message ===
										"string"
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
		<div className="p-4">
			<Card className="mb-4">
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
							<div key={test.labTestReportId} className="border rounded-lg p-4">
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
									<LabTestStatusBadge status={test.status} />
								</div>

								{test.status !== "Requested" && (
									<div className="ml-8 space-y-2">
										<Label>Upload Report</Label>
										<div className="flex gap-2">
											<Input
												type="file"
												accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
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
							onClick={() => navigate({ to: "/lab" })}
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
	);
}
