import { useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AutoSizer } from "react-virtualized";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import useVirtualList from "@/lib/hooks/useVirtualList";
import { handleErrors } from "@/lib/utils";
import { client } from "@/routes/api/$";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

const LabRequestModal = ({
	id,
	labTestModalOpen,
	setLabTestModalOpen,
	tests,
}: {
	id: string;
	labTestModalOpen: boolean;
	setLabTestModalOpen: (open: boolean) => void;
	tests: {
		id: number;
		name: string;
		category: string;
	}[];
}) => {
	const navigate = useNavigate();
	const [selectedLabTests, setSelectedLabTests] = useState<typeof tests>([]);
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const { renderList } = useVirtualList<(typeof tests)[number]>(300, 48);

	const filteredTests = useMemo(
		() =>
			tests
				.reduce(
					(acc, test) => {
						if (searchQuery === "") {
							acc.push({
								test,
								count: 0,
							});
							return acc;
						}

						const count = searchQuery
							.trim()
							.split(/\s+/)
							.reduce((count, term) => {
								return (
									count +
									(test.name.toLowerCase().includes(term.toLowerCase()) ||
									test.category.toLowerCase().includes(term.toLowerCase())
										? 1
										: 0)
								);
							}, 0);

						if (count > 0) {
							acc.push({
								test,
								count,
							});
						}
						return acc;
					},
					[] as { test: (typeof tests)[0]; count: number }[],
				)
				.sort((a, b) => b.count - a.count),
		[tests, searchQuery],
	);

	const handleRequestLabTests = async () => {
		if (selectedLabTests.length === 0) {
			toast.error("Please select at least one lab test");
			return;
		}

		const testIds = selectedLabTests.map((test) => test.id);
		const res = await client.api.doctor.requestLabTests.$post({
			json: {
				caseId: Number(id),
				testIds,
			},
		});
		const data = await handleErrors(res);
		if (!data) {
			return;
		}

		toast.success("Lab tests requested successfully");
		setLabTestModalOpen(false);
		setSelectedLabTests([]);
		navigate({ to: "/doctor" });
	};

	const handleAddTest = (test: (typeof tests)[number]) => {
		if (selectedLabTests.some((t) => t.id === test.id)) {
			toast.error("Lab test already selected");
			return;
		}
		setSelectedLabTests([...selectedLabTests, test]);
		setSearchQuery("");
	};

	const handleRemoveTest = (testId: number) => {
		setSelectedLabTests(selectedLabTests.filter((test) => test.id !== testId));
	};

	return (
		<Dialog open={labTestModalOpen} onOpenChange={setLabTestModalOpen}>
			<DialogContent className="lg:max-w-3xl lg:w-3xl">
				<DialogHeader>
					<DialogTitle>Request Lab Tests</DialogTitle>
				</DialogHeader>
				<div className="space-y-2">
					<Label className="text-sm text-muted-foreground flex flex-col items-start">
						Select the lab tests to request:
						<Popover open={searchOpen} onOpenChange={setSearchOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									className="justify-between w-full"
								>
									Select a test...
									<ChevronsUpDown className="ml-2 h-4 w-4" />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								className="p-0 sm:w-md lg:w-2xl w-sm"
								align="start"
								side="top"
							>
								<Command shouldFilter={false}>
									<CommandInput
										placeholder="Type to search..."
										value={searchQuery}
										onValueChange={setSearchQuery}
									/>
									<CommandList>
										<CommandEmpty>No tests found.</CommandEmpty>
										<AutoSizer disableHeight>
											{({ width }) =>
												renderList(
													filteredTests.map((item) => item.test),
													(key, item, style) => (
														<CommandItem
															key={key}
															style={style}
															onSelect={() => {
																handleAddTest(item);
																setSearchOpen(false);
															}}
															className="flex w-full justify-between"
														>
															<span>{item.name}</span>
															<span className="mx-1 text-muted-foreground text-right">
																({item.category})
															</span>
														</CommandItem>
													),
													width,
												)
											}
										</AutoSizer>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</Label>
					{selectedLabTests.map((test) => (
						<div
							key={test.id}
							className="flex items-center justify-between space-x-2 border rounded-md p-3"
						>
							<span>{test.name}</span>
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground">
									{" "}
									({test.category})
								</span>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => handleRemoveTest(test.id)}
									className="h-10 w-10 p-0"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
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
