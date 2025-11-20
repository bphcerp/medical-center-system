import { useRouter } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronsUpDown } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
import { client } from "@/routes/api/$";
import type { Medicine } from "@/routes/inventory";

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

	const [apiError, setApiError] = useState<boolean>(false);
	const [emptyError, setEmptyError] = useState<boolean>(false);

	const [medicinesSearchOpen, setMedicinesSearchOpen] =
		useState<boolean>(false);
	const [medicineQuery, setMedicineQuery] = useState<string>("");

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
	const medicationListRef = useRef(null);
	const medicationRowVirtualizer = useVirtualizer({
		count: filteredMedicines.length,
		getScrollElement: () => medicationListRef.current,
		estimateSize: () => 48,
		overscan: 15,
		initialOffset: 0,
	});

	const [medicineItems, setMedicineItems] = useState<Medicine[]>([]);

	const handleAddMedicineItem = (medicine: Medicine) => {
		if (medicineItems.some((item) => item.id === medicine.id)) {
			alert("This medicine is already in the list");
			return;
		}

		setMedicineItems((prev) => [...prev, medicine]);
		setMedicineQuery("");
		setMedicinesSearchOpen(false);
	};

	const resetState = () => {
		setMedicineItems([]);
		setEmptyError(false);
		setApiError(false);
	};

	const handleSubmit = async () => {
		if (medicineItems.length === 0) {
			resetState();
			setEmptyError(true);
			return;
		}

		const medicines = medicineItems.map(({ id }) => ({ id }));
		const res = await client.api.inventory.addMedicines.$post({
			json: { medicines },
		});

		if (res.status === 200) {
			await router.invalidate();
			resetState();
			onOpenChange(false);
		} else {
			resetState();
			setApiError(true);
		}
	};

	const handleCancel = () => {
		resetState();
		onOpenChange(false);
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
							<CommandList ref={medicationListRef}>
								<div
									style={{
										height:
											medicationRowVirtualizer.getTotalSize() > 0
												? `${medicationRowVirtualizer.getTotalSize()}px`
												: "auto",
									}}
									className="relative w-full"
								>
									<CommandEmpty>No medicines found.</CommandEmpty>
									{medicationRowVirtualizer
										.getVirtualItems()
										.map((virtualItem) => {
											const medicine =
												filteredMedicines[virtualItem.index].medicine;
											return (
												<CommandItem
													key={virtualItem.key}
													onSelect={() => {
														handleAddMedicineItem(medicine);
														setMedicinesSearchOpen(false);
													}}
													className="flex absolute top-0 left-0 w-full justify-between"
													style={{
														height: `${virtualItem.size}px`,
														transform: `translateY(${virtualItem.start}px)`,
													}}
												>
													<span>
														{medicine.company} {medicine.brand}
													</span>
													<span className="mx-1 text-muted-foreground text-right">
														({medicine.drug}) - {medicine.strength} -{" "}
														{medicine.type}
													</span>
												</CommandItem>
											);
										})}
								</div>
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
					<Button
						className="mb-2 mr-2"
						onClick={handleCancel}
						variant="outline"
					>
						Cancel
					</Button>
					<Button onClick={handleSubmit}>Submit</Button>
					{apiError && (
						<p className="text-destructive">Error: Failed to add a batch</p>
					)}
					{emptyError && (
						<p className="text-destructive">
							Error: Medicines have not been selected
						</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
