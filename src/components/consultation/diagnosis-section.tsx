import { ChevronsUpDown } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
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
import { CondensedLabel } from "../condensed-label";

export type DiagnosisItem = {
	id: number;
	name: string;
	icd: string;
};

const DiagnosisSection = ({
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
		<div className="text-card-foreground flex flex-col h-full gap-2">
			<div className="flex flex-col md:flex-row justify-between w-full gap-2">
				<CondensedLabel>Diagnosis</CondensedLabel>
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
								size="sm"
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
															className="flex flex-col w-full gap-1 items-start justify-center"
														>
															<span className="tabular-nums text-xs text-muted-foreground">
																{item.icd}
															</span>
															<span>{item.name}</span>
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
				<div className="grid grid-cols-[auto_1fr] gap-x-2 items-baseline">
					{diagnosisItems.map((item) => (
						<Fragment key={item.id}>
							<span className="col-start-1 text-xs tabular-nums text-muted-foreground">
								{item.icd}
							</span>
							<Button
								variant="ghost"
								className="col-start-2 px-0 justify-start py-0 max-h-8 text-base font-medium hover:bg-transparent hover:cursor-pointer hover:line-through hover:text-destructive transition-none"
								onClick={() => handleRemoveDiagnosisItem(item.id)}
							>
								{item.name}
							</Button>
						</Fragment>
					))}
				</div>
			) : (
				<div className="text-center my-auto text-muted-foreground">
					No diagnosis recorded
				</div>
			)}
		</div>
	);
};

export default DiagnosisSection;
