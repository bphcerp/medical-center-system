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
import useAuth from "@/lib/hooks/useAuth";
import { cn, handleUnauthorized } from "@/lib/utils";
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
	useAuth(["lab"]);
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
					<div className="flex flex-col gap-6">
						{tests.map((test) => (
							<div
								key={test.labTestReportId}
								className="flex flex-col border rounded-lg overflow-clip"
							>
								<Label className="flex items-center gap-2 text-lg font-medium cursor-pointer w-full p-4 has-aria-checked:bg-accent hover:bg-accent transition-colors">
									<Checkbox
										id={`test-${test.labTestReportId}`}
										className="size-6 [&>svg]:size-10"
										checked={test.status !== "Requested"}
										onCheckedChange={(checked) =>
											handleCheckboxChange(
												test.labTestReportId,
												checked as boolean,
											)
										}
									/>
									{test.testName}
									<LabTestStatusBadge status={test.status} />
								</Label>

								{test.status !== "Requested" && (
									<div className="p-4 flex flex-col gap-2">
										<Label className="flex flex-col items-start gap-3">
											Upload Report
											<div className="flex gap-2 w-full">
												<Input
													type="file"
													accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
													className={cn(
														"transition-colors hover:enabled:cursor-pointer hover:enabled:bg-accent file:mr-4 p-0 h-auto",
														"file:px-4 file:py-6 file:items-center file:border-r-2 file:border-border file:text-sm file:font-semibold w-full",
													)}
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) {
															handleFileUpload(test.labTestReportId, file);
														}
													}}
													disabled={
														uploading[test.labTestReportId] || isSubmitting
													}
												/>
											</div>
										</Label>
										{(test.fileId !== null ||
											uploading[test.labTestReportId]) && (
											<Badge
												variant="outline"
												className={cn(
													test.fileId !== null
														? "bg-bits-green-foreground text-bits-green"
														: "bg-bits-yellow-foreground text-bits-yellow",
													"rounded-lg border-0",
												)}
											>
												{test.fileId !== null
													? "File uploaded"
													: "Uploading..."}
											</Badge>
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
