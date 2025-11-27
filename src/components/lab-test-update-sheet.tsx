import { useRouter } from "@tanstack/react-router";
import { File, Plus, TestTube, Trash, Undo } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { handleErrors } from "@/lib/utils";
import { client } from "@/routes/api/$";
import { LabTestStatusBadge } from "./lab-test-status-badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "./ui/empty";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { SheetContent, SheetFooter, SheetHeader, SheetTitle } from "./ui/sheet";

interface LabTest {
	id: number;
	testId: number;
	testName: string;
	status: "Sample Collected" | "Requested" | "Complete";
	metadata: unknown;
	files: {
		fileId: number;
		filename: string;
	}[];
}

type NewFile = {
	id: number;
	action: "add";
	file: File;
};

type OldFile = {
	id: number;
	action: "remove" | "keep";
	file: {
		fileId: number;
		filename: string;
	};
};

type FileDiff = NewFile | OldFile;

const LabTestUpdateSheet = ({
	test,
	close,
}: {
	test: LabTest;
	close: () => void;
}) => {
	const checkboxId = useId();
	const fileInputId = useId();
	const [status, setStatus] = useState<LabTest["status"]>(test.status);
	const [files, setFiles] = useState<FileDiff[]>(
		test.files.map((file) => ({
			id: file.fileId,
			action: "keep",
			file,
		})),
	);
	const router = useRouter();
	useEffect(() => {
		setStatus(test.status);
		setFiles(
			test.files.map((file) => ({
				id: file.fileId,
				action: "keep",
				file,
			})),
		);
	}, [test]);

	const hasChanges =
		files.some((f) => f.action !== "keep") || test.status !== status;

	const handleSave = async () => {
		let add: File[] = [];
		let remove: number[] | undefined;
		let keep: number[] = [];
		let newStatus = status;
		if (status === "Requested") {
			// If status is Requested, we don't add any files, and remove all existing files
			remove = (files.filter((f) => f.action !== "add") as OldFile[]).map(
				(f) => f.file.fileId,
			);
		} else {
			add = (files.filter((f) => f.action === "add") as NewFile[]).map(
				(f) => f.file,
			);
			keep = (files.filter((f) => f.action === "keep") as OldFile[]).map(
				(f) => f.file.fileId,
			);
			remove = (files.filter((f) => f.action === "remove") as OldFile[]).map(
				(f) => f.file.fileId,
			);
			if (add.length > 0 || keep.length > 0) {
				newStatus = "Complete";
			}
			// If all files are removed, but previous status was Complete, downgrade to Sample Collected
			if (remove.length === files.length) {
				newStatus = status === "Complete" ? "Sample Collected" : status;
			}
		}

		const res = await client.api.lab.update[":testId"].$post({
			param: { testId: test.id.toString() },
			form: {
				status: newStatus,
				keep: keep,
				remove: remove,
				add: add,
			},
		});
		const data = await handleErrors(res);
		if (!data) {
			return;
		}

		toast.success("Lab test results updated successfully!");
		await router.invalidate();
		close();
	};

	const handleCheck = () => {
		if (status === "Requested") {
			setStatus("Sample Collected");
		} else {
			setStatus("Requested");
		}
	};

	return (
		<SheetContent className="sm:min-w-xl min-w-screen">
			<SheetHeader>
				<SheetTitle className="gap-2 flex items-center w-11/12">
					<span className="text-left line-clamp-2">{test.testName}</span>
					<LabTestStatusBadge status={status} />
				</SheetTitle>
				<Input
					type="file"
					accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
					onChange={(e) => {
						const files = e.target.files;
						if (!files || files.length === 0) return;
						const newFiles: FileDiff[] = [];
						for (let i = 0; i < files.length; i++) {
							newFiles.push({
								id: Date.now() + i,
								action: "add",
								file: files[i],
							});
						}
						setFiles((prev) => [...prev, ...newFiles]);
					}}
					value={""}
					multiple
					hidden
					id={fileInputId}
				/>
			</SheetHeader>
			<div className="flex flex-col gap-6 px-4">
				<div className="flex gap-3 items-center">
					<Checkbox
						id={checkboxId}
						checked={status !== "Requested"}
						className="w-6 h-6 rounded"
						onCheckedChange={() => handleCheck()}
					/>
					<Label htmlFor={checkboxId} className="text-md">
						Sample Collected
					</Label>
				</div>
				<div className="flex flex-col gap-2">
					{status === "Requested" ? (
						<Empty className="border border-dashed">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<TestTube />
								</EmptyMedia>
								<EmptyTitle>Sample not collected</EmptyTitle>
								<EmptyDescription>
									Mark the sample as collected to upload test reports.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<>
							<div className="flex items-center gap-3">
								<Label className="font-medium text-lg">Uploaded Files</Label>
								{files.length === 0 || (
									<Button variant="default" size="sm" asChild>
										<Label htmlFor={fileInputId}>
											<Plus />
											Add files
										</Label>
									</Button>
								)}
							</div>
							{files.length === 0 ? (
								<Empty className="border border-dashed">
									<EmptyHeader>
										<EmptyMedia variant="icon">
											<File />
										</EmptyMedia>
										<EmptyTitle>No files uploaded</EmptyTitle>
										<EmptyDescription>
											Upload test reports to lab requests to mark them as
											complete.
										</EmptyDescription>
									</EmptyHeader>
									<EmptyContent>
										<Button variant="outline" size="sm" asChild>
											<Label htmlFor={fileInputId}>Choose file</Label>
										</Button>
									</EmptyContent>
								</Empty>
							) : (
								files.map((file) => (
									<div
										key={file.id}
										className="flex items-center justify-between"
									>
										<span
											className={`flex overflow-hidden ${file.action === "add" ? "text-bits-green" : file.action === "remove" ? "text-bits-red" : "text-foreground"} gap-1 items-center`}
										>
											{file.action === "add" && <Plus className="size-4" />}
											<span
												className={`truncate transition duration-300 decoration-2 ${file.action === "remove" ? "line-through decoration-bits-red/60" : "decoration-bits-red/0"}`}
											>
												{"filename" in file.file
													? file.file.filename
													: file.file.name}
											</span>
										</span>
										<Button
											variant="ghost"
											data-slot={file.action}
											className={`text-sm px-4 duration-300 transition ${
												file.action === "remove"
													? "text-bits-red bg-bits-red/10 hover:text-foreground hover:bg-accent"
													: "text-foreground bg-accent hover:text-bits-red hover:bg-bits-red/10"
											}`}
											onClick={() => {
												if (file.action === "add") {
													setFiles((prev) =>
														prev.filter((f) => f.id !== file.id),
													);
												} else if (file.action === "remove") {
													setFiles((prev) =>
														prev.map((f) =>
															f.id === file.id && f.action === "remove"
																? { ...f, action: "keep" }
																: f,
														),
													);
												} else {
													setFiles((prev) =>
														prev.map((f) =>
															f.id === file.id && f.action === "keep"
																? { ...f, action: "remove" }
																: f,
														),
													);
												}
											}}
										>
											{file.action === "add" ? (
												<Trash />
											) : file.action === "remove" ? (
												<Undo />
											) : (
												<Trash />
											)}
										</Button>
									</div>
								))
							)}
						</>
					)}
				</div>
			</div>
			<SheetFooter>
				<Button
					disabled={!hasChanges}
					className="w-full"
					onClick={async () => {
						await handleSave();
					}}
				>
					Save Changes
				</Button>
			</SheetFooter>
		</SheetContent>
	);
};

export default LabTestUpdateSheet;
