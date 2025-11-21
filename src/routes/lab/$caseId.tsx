import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { LabTestStatusBadge } from "@/components/lab-test-status-badge";
import { PatientDetails } from "@/components/patient-details";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { statusEnums } from "@/db/lab";
import useAuth from "@/lib/hooks/useAuth";
import { cn, getAge, handleUnauthorized } from "@/lib/utils";
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

		const data = await res.json();
		return {
			...data,
			patient: {
				...data.patient,
				age: getAge(data.patient.birthdate),
			},
		};
	},
	component: TestEntry,
});

function TestEntry() {
	useAuth(["lab"]);
	const navigate = useNavigate();
	const {
		caseId,
		patient,
		doctorName,
		token,
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
		<div className="p-4 pb-0 lg:p-12 lg:pb-0 flex flex-col gap-6 h-full min-h-0 overflow-y-scroll">
			<PatientDetails
				patient={patient}
				token={token}
				label={
					<>
						Lab tests requested by{" "}
						<span className="font-semibold">{doctorName}</span>
					</>
				}
			/>

			<div className="grow flex flex-col gap-4 ">
				{tests.map((test) => (
					<div
						key={test.labTestReportId}
						className="flex flex-col border-2 rounded-lg overflow-clip"
					>
						<Label className="flex items-center gap-2 text-lg font-medium cursor-pointer w-full p-4 has-aria-checked:border-b hover:bg-accent transition-colors">
							<Checkbox
								id={`test-${test.labTestReportId}`}
								className="size-6 [&>svg]:size-10"
								checked={test.status !== "Requested"}
								onCheckedChange={(checked) =>
									handleCheckboxChange(test.labTestReportId, checked as boolean)
								}
							/>
							{test.testName}
							<LabTestStatusBadge status={test.status} />
						</Label>

						{test.status !== "Requested" && (
							<div className="p-4 flex flex-col gap-2">
								<Label className="min-h-6">
									Upload Report
									{uploading[test.labTestReportId] && (
										<Spinner className="size-4" />
									)}
									{test.fileId !== null && (
										<Check className="text-bits-green size-5" />
									)}
								</Label>
								<div className="flex items-center gap-2 w-full">
									<Input
										type="file"
										accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
										className={cn(
											"transition-colors hover:enabled:cursor-pointer hover:enabled:bg-accent file:mr-4 p-0 h-auto",
											"file:px-4 file:py-4 file:items-center file:border-r-2 file:border-border file:text-sm file:font-semibold w-full",
										)}
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) {
												handleFileUpload(test.labTestReportId, file);
											}
										}}
										disabled={uploading[test.labTestReportId] || isSubmitting}
									/>
								</div>
							</div>
						)}
					</div>
				))}
			</div>
			<div
				className={cn(
					"sticky bottom-0 flex justify-end gap-3 py-4 lg:py-12",
					"bg-linear-to-t from-background to-transparent from-80% via-90% to-100%",
				)}
			>
				<Button
					variant="outline"
					onClick={() => navigate({ to: "/lab" })}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
				<Button onClick={handleSubmit} disabled={!hasChanges || isSubmitting}>
					{isSubmitting ? "Updating..." : "Update Tests"}
				</Button>
			</div>
		</div>
	);
}
