import { Label } from "@radix-ui/react-label";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronsUpDown, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

export type DiagnosisItem = {
	id: number;
	name: string;
	icd: string;
};

const DiagnosisCard = ({
	diseases,
	diagnosisItems,
	setDiagnosisItems,
	readonly = false,
}: {
	diseases: {
		id: number;
		name: string;
		icd: string;
	}[];
	diagnosisItems: DiagnosisItem[];
	setDiagnosisItems: (items: DiagnosisItem[]) => void;
	readonly?: boolean;
}) => {
	const [diseasesSearchOpen, setDiseasesSearchOpen] = useState<boolean>(false);
	const [diagnosisQuery, setDiagnosisQuery] = useState<string>("");
	const diseaseListRef = useRef(null);

	const filteredDiseases = useMemo(
		() =>
			diseases
				.reduce(
					(acc, disease) => {
						if (diagnosisQuery === "") {
							acc.push({
								disease,
								count: 0,
							});
							return acc;
						}

						const count = diagnosisQuery
							.trim()
							.split(/\s+/)
							.reduce((count, term) => {
								return (
									count +
									(disease.icd.toLowerCase().includes(term.toLowerCase()) ||
									disease.name.toLowerCase().includes(term.toLowerCase())
										? 1
										: 0)
								);
							}, 0);

						if (count > 0) {
							acc.push({
								disease,
								count,
							});
						}
						return acc;
					},
					[] as { disease: (typeof diseases)[0]; count: number }[],
				)
				.sort((a, b) => b.count - a.count),
		[diagnosisQuery, diseases.reduce],
	);
	const diseaseRowVirtualizer = useVirtualizer({
		count: filteredDiseases.length,
		getScrollElement: () => diseaseListRef.current,
		estimateSize: () => 48,
		overscan: 15,
		initialOffset: 0,
	});

	const handleAddDisease = (disease: (typeof diseases)[0]) => {
		if (diagnosisItems.some((item) => item.id === disease.id)) {
			alert("This disease is already in the diagnosis");
			return;
		}

		const newItem: DiagnosisItem = {
			id: disease.id,
			name: disease.name,
			icd: disease.icd,
		};

		setDiagnosisItems([...diagnosisItems, newItem]);
		setDiagnosisQuery("");
	};

	const handleRemoveDiagnosisItem = (id: number) => {
		setDiagnosisItems(diagnosisItems.filter((item) => item.id !== id));
	};

	return (
		<Card className="col-span-2 row-span-1 rounded-l-none rounded-br-none min-h-52 gap-2">
			<div className="flex items-center w-full gap-2 px-2">
				<Label className="font-semibold">Diagnosis: </Label>
				{!readonly && (
					<Popover
						open={diseasesSearchOpen}
						onOpenChange={setDiseasesSearchOpen}
					>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								role="combobox"
								className="justify-between w-3xl"
							>
								Select a disease...
								<ChevronsUpDown className="ml-2 h-4 w-4" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="p-0 w-3xl" align="start" side="top">
							<Command shouldFilter={false}>
								<CommandInput
									placeholder="Type a disease to search..."
									value={diagnosisQuery}
									onValueChange={setDiagnosisQuery}
								/>
								<CommandList ref={diseaseListRef}>
									<div
										style={{
											height:
												diseaseRowVirtualizer.getTotalSize() > 0
													? `${diseaseRowVirtualizer.getTotalSize()}px`
													: "auto",
										}}
										className="relative w-full"
									>
										<CommandEmpty>No diseases found.</CommandEmpty>
										<CommandGroup>
											{diseaseRowVirtualizer
												.getVirtualItems()
												.map((virtualItem) => {
													const disease =
														filteredDiseases[virtualItem.index].disease;
													return (
														<CommandItem
															key={virtualItem.key}
															onSelect={() => {
																handleAddDisease(disease);
																setDiseasesSearchOpen(false);
															}}
															className="flex absolute top-0 left-0 w-full justify-between"
															style={{
																height: `${virtualItem.size}px`,
																transform: `translateY(${virtualItem.start}px)`,
															}}
														>
															<span>
																{disease.name} (ICD: {disease.icd})
															</span>
														</CommandItem>
													);
												})}
										</CommandGroup>
									</div>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				)}
			</div>
			{diagnosisItems.length > 0 &&
				diagnosisItems.map((item) => (
					<div key={item.id} className="px-2">
						<div className="w-full flex flex-wrap gap-2">
							<span className="font-medium">{item.name}</span>
							<span className="font-medium text-muted-foreground">
								(ICD: {item.icd})
							</span>
							{!readonly && (
								<Button
									variant="destructive"
									onClick={() => handleRemoveDiagnosisItem(item.id)}
									className="h-6 w-6"
								>
									<Trash2 />
								</Button>
							)}
						</div>
					</div>
				))}
		</Card>
	);
};

export default DiagnosisCard;
