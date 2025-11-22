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
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { injectionRoutes, mealTimings } from "@/db/case";
import useVirtualList from "@/lib/hooks/useVirtualList";
import PrescriptionCapsuleFields from "./capsule-fields";
import PrescriptionExternalFields from "./external-fields";
import PrescriptionInjectionFields from "./injection-fields";
import PrescriptionSyrupFields from "./syrup-fields";
import type { MedicineItem, PrescriptionItem } from "./types";

const PrescriptionCard = ({
	medicines,
	prescriptionItems,
	setPrescriptionItems,
}: {
	medicines: MedicineItem[];
	prescriptionItems: PrescriptionItem[];
	setPrescriptionItems: (items: PrescriptionItem[]) => void;
}) => {
	const [medicinesSearchOpen, setMedicinesSearchOpen] =
		useState<boolean>(false);
	const [prescriptionQuery, setPrescriptionQuery] = useState<string>("");
	const { renderList } = useVirtualList<MedicineItem>(300, 48);

	const filteredMedicines = useMemo(
		() =>
			medicines
				.reduce(
					(acc, medicine) => {
						if (prescriptionQuery === "") {
							acc.push({
								medicine,
								count: 0,
							});
							return acc;
						}

						const count = prescriptionQuery
							.trim()
							.split(/\s+/)
							.reduce((count, term) => {
								return (
									count +
									(medicine.drug.toLowerCase().includes(term.toLowerCase()) ||
									medicine.brand.toLowerCase().includes(term.toLowerCase()) ||
									medicine.company.toLowerCase().includes(term.toLowerCase()) ||
									medicine.type.toLowerCase().includes(term.toLowerCase())
										? 1
										: 0)
								);
							}, 0);

						if (count > 0) {
							acc.push({
								medicine,
								count,
							});
						}
						return acc;
					},
					[] as { medicine: (typeof medicines)[0]; count: number }[],
				)
				.sort((a, b) => b.count - a.count),
		[medicines, prescriptionQuery],
	);

	const handleUpdatePrescriptionItem = (
		id: number,
		field: keyof Omit<
			PrescriptionItem["case_prescriptions"],
			"id" | "medicine"
		>,
		value: string | PrescriptionItem["case_prescriptions"]["categoryData"],
	) => {
		setPrescriptionItems(
			prescriptionItems.map((item) =>
				item.medicines.id === id
					? {
							...item,
							case_prescriptions: {
								...item.case_prescriptions,
								[field]: value,
							},
						}
					: item,
			),
		);
	};

	const handleRemovePrescriptionItem = (id: number) => {
		setPrescriptionItems(
			prescriptionItems.filter((item) => item.medicines.id !== id),
		);
	};

	const handleAddMedicine = (medicine: (typeof medicines)[0]) => {
		//heck if medicine already exists in the prescription
		if (prescriptionItems.some((item) => item.medicines.id === medicine.id)) {
			toast.error("This medicine is already in the prescription");
			return;
		}

		const newItem: PrescriptionItem = {
			medicines: medicine,
			case_prescriptions: {
				dosage: "",
				frequency: "",
				duration: "",
				durationUnit: "days",
				categoryData:
					medicine.category === "Capsule/Tablet" ||
					medicine.category === "Liquids/Syrups"
						? {
								mealTiming: mealTimings[0],
								category: medicine.category,
							}
						: medicine.category === "External Application"
							? {
									applicationArea: "",
									category: "External Application",
								}
							: medicine.category === "Injection"
								? {
										injectionRoute: injectionRoutes[0],
										category: "Injection",
									}
								: null,
				comment: "",
			},
		};
		setPrescriptionItems([...prescriptionItems, newItem]);
		setPrescriptionQuery("");
	};

	return (
		<Card className="col-span-2 gap-4 row-span-1 rounded-none min-h-52">
			<div className="flex items-center w-full gap-2 px-2">
				<Label className="font-semibold">Prescription: </Label>
				<Popover
					open={medicinesSearchOpen}
					onOpenChange={setMedicinesSearchOpen}
				>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							className="justify-between w-3xl"
						>
							Select a medicine...
							<ChevronsUpDown className="ml-2 h-4 w-4" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="p-0 w-3xl" align="start" side="top">
						<Command shouldFilter={false}>
							<CommandInput
								placeholder="Type a medicine to search..."
								value={prescriptionQuery}
								onValueChange={setPrescriptionQuery}
							/>
							<CommandList>
								<CommandEmpty>No medicines found.</CommandEmpty>
								<AutoSizer disableHeight>
									{({ width }) =>
										renderList(
											filteredMedicines.map((item) => item.medicine),
											(key, item, style) => (
												<CommandItem
													key={key}
													style={style}
													onSelect={() => {
														handleAddMedicine(item);
														setMedicinesSearchOpen(false);
													}}
													className="flex w-full justify-between"
												>
													<span>
														{item.company} {item.brand}
													</span>
													<span className="mx-1 text-muted-foreground text-right">
														({item.drug}) - {item.strength} - {item.type}
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
			</div>
			{prescriptionItems.length > 0 ? (
				prescriptionItems.map((item) => (
					<div key={item.medicines.id} className="px-2">
						<div className="w-full pb-1 flex flex-wrap items-center gap-2">
							<span className="font-semibold">
								{item.medicines.company} {item.medicines.brand}
							</span>
							<span className="text-muted-foreground text-sm">
								({item.medicines.drug}) - {item.medicines.strength}
							</span>
							<span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
								{item.medicines.type}
							</span>
						</div>
						<div className="gap-0.5 flex">
							<PrescriptionCapsuleFields
								item={item}
								handleUpdate={handleUpdatePrescriptionItem}
							/>
							<PrescriptionExternalFields
								item={item}
								handleUpdate={handleUpdatePrescriptionItem}
							/>
							<PrescriptionInjectionFields
								item={item}
								handleUpdate={handleUpdatePrescriptionItem}
							/>
							<PrescriptionSyrupFields
								item={item}
								handleUpdate={handleUpdatePrescriptionItem}
							/>
							<Button
								variant="destructive"
								size="sm"
								onClick={() => handleRemovePrescriptionItem(item.medicines.id)}
								className="h-10 w-10 p-0"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				))
			) : (
				<div className="flex items-center justify-center h-full text-muted-foreground">
					No prescription recorded
				</div>
			)}
		</Card>
	);
};

export default PrescriptionCard;
export * from "./selectors";
