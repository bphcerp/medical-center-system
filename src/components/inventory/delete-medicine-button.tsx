import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Medicine } from "@/lib/types/inventory";

export function DeleteMedicineModal({
	open,
	onOpenChange,
	inventoryId,
	medicine,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	inventoryId: number | null;
	medicine: Medicine | null;
}) {
	const handleDelete = async () => {
		//call API here
		onOpenChange(false);
	};

	if (!medicine || !inventoryId) return;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<div className="mb-3">Delete medicine:</div>
						<div>
							<span className="font-semibold">
								{medicine.company} {medicine.brand}
							</span>
							<span className="mx-1 text-muted-foreground text-right">
								({medicine.drug}) - {medicine.strength} - {medicine.type}
							</span>
						</div>
					</DialogTitle>
				</DialogHeader>

				<DialogDescription>
					Are you sure you want to delete this medicine? This action cannot be
					undone.
				</DialogDescription>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
					</DialogClose>
					<Button variant="destructive" onClick={handleDelete}>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
