import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { client } from "@/routes/api/$";

const LabRequestModal = ({
	id,
	labTestModalOpen,
	setLabTestModalOpen,
	tests,
}: {
	id: string;
	labTestModalOpen: boolean;
	setLabTestModalOpen: (open: boolean) => void;
	tests: { id: number; name: string }[];
}) => {
	const [selectedLabTests, setSelectedLabTests] = useState<Set<number>>(
		new Set(),
	);

	const handleRequestLabTests = async () => {
		if (selectedLabTests.size === 0) {
			alert("Please select at least one lab test");
			return;
		}

		const testIds = Array.from(selectedLabTests);
		const res = await client.api.doctor.requestLabTests.$post({
			json: {
				caseId: Number(id),
				testIds,
			},
		});

		if (res.status !== 200) {
			const error = await res.json();
			alert("error" in error ? error.error : "Failed to request lab tests");
			return;
		}

		alert("Lab tests requested successfully");
		setLabTestModalOpen(false);
		setSelectedLabTests(new Set());
	};

	const handleToggleLabTest = (testId: number) => {
		const newSelected = new Set(selectedLabTests);
		if (newSelected.has(testId)) {
			newSelected.delete(testId);
		} else {
			newSelected.add(testId);
		}
		setSelectedLabTests(newSelected);
	};

	return (
		<Dialog open={labTestModalOpen} onOpenChange={setLabTestModalOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Request Lab Tests</DialogTitle>
				</DialogHeader>
				<div className="space-y-2">
					<p className="text-sm text-muted-foreground">
						Select the lab tests to request:
					</p>
					{tests.map((test) => (
						// biome-ignore lint/a11y/noStaticElementInteractions: TODO: replace this with a checkbox-like element to improve accessibility
						// biome-ignore lint/a11y/useKeyWithClickEvents: see above TODO
						<div
							key={test.id}
							className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-accent"
							onClick={() => handleToggleLabTest(test.id)}
						>
							<div
								className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
									selectedLabTests.has(test.id)
										? "bg-primary border-primary"
										: "border-muted-foreground"
								}`}
							>
								{selectedLabTests.has(test.id) && (
									<div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
								)}
							</div>
							<span>{test.name}</span>
						</div>
					))}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setLabTestModalOpen(false)}>
						Cancel
					</Button>
					<Button onClick={handleRequestLabTests}>Submit</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default LabRequestModal;
