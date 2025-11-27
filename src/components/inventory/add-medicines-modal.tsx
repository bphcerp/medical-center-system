import { useRouter } from "@tanstack/react-router";
import { ChevronsUpDown } from "lucide-react";
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
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import useVirtualList from "@/lib/hooks/useVirtualList";
import type { Medicine } from "@/lib/types/inventory";
import { handleErrors } from "@/lib/utils";
import { client } from "@/routes/api/$";

export function AddMedicinesModal({
	open,
	onOpenChange,
	medicines,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	medicines: Medicine[];
}) {
	const router = useRouter();
	const [medicinesSearchOpen, setMedicinesSearchOpen] =
		useState<boolean>(false);
	const [medicineItems, setMedicineItems] = useState<Medicine[]>([]);
	const [medicineQuery, setMedicineQuery] = useState<string>("");
	const { renderList } = useVirtualList<Medicine>(300, {
		"2xl": 48,
		xl: 60,
		lg: 48,
		md: 48,
		sm: 60,
		xs: 144,
	});

	const filteredMedicines = useMemo(
		() =>
			medicines
				.reduce(
					(acc, medicine) => {
						if (medicineQuery === "") {
							acc.push({
								medicine,
								count: 0,
							});
							return acc;
						}

						const count = medicineQuery
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
		[medicines, medicineQuery],
	);

	const handleAddMedicineItem = (medicine: Medicine) => {
		if (medicineItems.some((item) => item.id === medicine.id)) {
			toast.error("This medicine is already in the list");
			return;
		}

		setMedicineItems((prev) => [...prev, medicine]);
		setMedicineQuery("");
		setMedicinesSearchOpen(false);
	};

	const handleClose = () => {
		setMedicineQuery("");
		setMedicinesSearchOpen(false);
		setMedicineItems([]);
		onOpenChange(false);
	};

	const handleSubmit = async () => {
		if (medicineItems.length === 0) {
			toast.error("Please select at least one medicine");
			return;
		}

		const medicines = medicineItems.map(({ id }) => ({ id }));
		const res = await client.api.inventory.addMedicines.$post({
			json: { medicines },
		});
		const data = await handleErrors(res);
		if (!data) {
			return;
		}

		await router.invalidate();
		handleClose();
	};

	if (!medicines) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add New Medicines</DialogTitle>
					<DialogDescription>
						Add new medicines to the inventory
					</DialogDescription>
				</DialogHeader>
				<Popover
					open={medicinesSearchOpen}
					onOpenChange={setMedicinesSearchOpen}
				>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							className="justify-between"
						>
							Select a medicine...
							<ChevronsUpDown className="ml-2 h-4 w-4" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="p-0 w-3xl" align="start" side="top">
						<Command shouldFilter={false}>
							<CommandInput
								placeholder="Type a medicine to search..."
								value={medicineQuery}
								onValueChange={setMedicineQuery}
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
														handleAddMedicineItem(item);
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
				{medicineItems.length > 0 ? (
					medicineItems.map((item) => (
						<div key={item.id} className="px-2">
							<div className="w-full pb-1 flex flex-wrap items-center gap-2">
								<span className="font-semibold">
									{item.company} {item.brand}
								</span>
								<span className="text-muted-foreground text-sm">
									({item.drug}) - {item.strength}
								</span>
								<span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
									{item.type}
								</span>
							</div>
						</div>
					))
				) : (
					<p>No medicines have been added</p>
				)}
				<div>
					<Button className="mb-2 mr-2" onClick={handleClose} variant="outline">
						Cancel
					</Button>
					<Button onClick={handleSubmit}>Submit</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
