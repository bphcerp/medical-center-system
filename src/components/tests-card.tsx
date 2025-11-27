import { Label } from "@radix-ui/react-label";
import { ChevronsUpDown, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AutoSizer } from "react-virtualized";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import useVirtualList from "@/lib/hooks/useVirtualList";

export type TestItem = {
	id: number;
	name: string;
	category: string;
};

const TestsCard = ({
	tests,
	testItems,
	setTestItems,
	readonly = false,
}: {
	tests: TestItem[];
	testItems: TestItem[];
	setTestItems: (items: TestItem[]) => void;
	readonly?: boolean;
}) => {
	const [testsSearchOpen, setTestsSearchOpen] = useState<boolean>(false);
	const [testQuery, setTestQuery] = useState<string>("");
	const { renderList } = useVirtualList<TestItem>(300, 48);

	const filteredTests = useMemo(
		() =>
			tests
				.reduce(
					(acc, test) => {
						if (testQuery === "") {
							acc.push({
								test,
								count: 0,
							});
							return acc;
						}

						const count = testQuery
							.trim()
							.split(/\s+/)
							.reduce((count, term) => {
								return (
									count +
									(test.category.toLowerCase().includes(term.toLowerCase()) ||
									test.name.toLowerCase().includes(term.toLowerCase())
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
		[testQuery, tests],
	);

	const handleAddTest = (test: (typeof tests)[0]) => {
		if (testItems.some((item) => item.id === test.id)) {
			toast.error("This test is already in the list");
			return;
		}

		const newItem: TestItem = {
			id: test.id,
			name: test.name,
			category: test.category,
		};

		setTestItems([...testItems, newItem]);
		setTestQuery("");
	};

	const handleRemoveTestItem = (id: number) => {
		setTestItems(testItems.filter((item) => item.id !== id));
	};

	return (
		<div>
			<div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-2">
				<Label className="font-semibold text-lg">Tests: </Label>
				{!readonly && (
					<Popover open={testsSearchOpen} onOpenChange={setTestsSearchOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								role="combobox"
								className="justify-between text-muted-foreground xl:w-[calc(50dvw-8rem)] md:w-[calc(100dvw-10rem)] w-[calc(100dvw-6rem)]"
							>
								Select a test...
								<ChevronsUpDown className="ml-2 h-4 w-4" />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className="p-0 xl:w-[calc(50dvw-8rem)] md:w-[calc(100dvw-10rem)] w-[calc(100dvw-6rem)]"
							align="start"
							side="top"
						>
							<Command shouldFilter={false}>
								<CommandInput
									placeholder="Type a test to search..."
									value={testQuery}
									onValueChange={setTestQuery}
								/>
								<CommandEmpty>No tests found.</CommandEmpty>
								<CommandGroup>
									<CommandList>
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
																setTestsSearchOpen(false);
															}}
															className="flex w-full justify-between"
														>
															<span>
																{item.name} (Category: {item.category})
															</span>
														</CommandItem>
													),
													width,
												)
											}
										</AutoSizer>
									</CommandList>
								</CommandGroup>
							</Command>
						</PopoverContent>
					</Popover>
				)}
			</div>
			{testItems.length > 0 ? (
				<div className="py-4">
					{testItems.map((item) => (
						<div key={item.id} className="py-2">
							<div className="w-full flex flex-wrap gap-2">
								<span className="font-medium">{item.name}</span>
								<span className="font-medium text-muted-foreground">
									(Category: {item.category})
								</span>
								{!readonly && (
									<Button
										variant="destructive"
										onClick={() => handleRemoveTestItem(item.id)}
										className="h-6 w-6"
									>
										<Trash2 />
									</Button>
								)}
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="flex items-center justify-center text-muted-foreground py-6">
					No tests recorded
				</div>
			)}
		</div>
	);
};

export default TestsCard;
