import { Label } from "@radix-ui/react-label";
import { ChevronsUpDown, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AutoSizer } from "react-virtualized";
import { toast } from "sonner";
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
import useVirtualList from "@/lib/hooks/useVirtualList";

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
	diseases: DiagnosisItem[];
	diagnosisItems: DiagnosisItem[];
	setDiagnosisItems: (items: DiagnosisItem[]) => void;
	readonly?: boolean;
}) => {
	const [diseasesSearchOpen, setDiseasesSearchOpen] = useState<boolean>(false);
	const [diagnosisQuery, setDiagnosisQuery] = useState<string>("");
	const { renderList } = useVirtualList<DiagnosisItem>(300, {
		"2xl": 72,
		xl: 84,
		lg: 60,
		md: 72,
		sm: 72,
		xs: 168,
	});

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
		[diagnosisQuery, diseases],
	);

	const handleAddDisease = (disease: (typeof diseases)[0]) => {
		if (diagnosisItems.some((item) => item.id === disease.id)) {
			toast.error("This disease is already in the diagnosis");
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
		<Card className="col-span-1 row-span-1 xl:rounded-tr-xl xl:rounded-l-none xl:rounded-br-none rounded-none min-h-52 gap-2 pt-3 px-4">
			<div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-2">
				<Label className="font-semibold text-lg">Diagnosis: </Label>
				{!readonly && (
					<Popover
						open={diseasesSearchOpen}
						onOpenChange={setDiseasesSearchOpen}
					>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								role="combobox"
								className="justify-between text-muted-foreground xl:w-[calc(50dvw-10rem)] md:w-[calc(100dvw-12rem)] w-[calc(100dvw-6rem)]"
							>
								Select a disease...
								<ChevronsUpDown className="ml-2 h-4 w-4" />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className="p-0 xl:w-[calc(50dvw-10rem)] md:w-[calc(100dvw-12rem)] w-[calc(100dvw-6rem)]"
							align="start"
							side="top"
						>
							<Command shouldFilter={false}>
								<CommandInput
									placeholder="Type a disease to search..."
									value={diagnosisQuery}
									onValueChange={setDiagnosisQuery}
								/>
								<CommandEmpty>No diseases found.</CommandEmpty>
								<CommandGroup>
									<CommandList>
										<AutoSizer disableHeight>
											{({ width }) =>
												renderList(
													filteredDiseases.map((item) => item.disease),
													(key, item, style) => (
														<CommandItem
															key={key}
															style={style}
															onSelect={() => {
																handleAddDisease(item);
																setDiseasesSearchOpen(false);
															}}
															className="flex w-full justify-between"
														>
															<span>
																{item.name} (ICD: {item.icd})
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
			{diagnosisItems.length > 0 ? (
				diagnosisItems.map((item) => (
					<div key={item.id}>
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
				))
			) : (
				<div className="flex items-center justify-center h-full text-muted-foreground">
					No diagnosis recorded
				</div>
			)}
		</Card>
	);
};

export default DiagnosisCard;
