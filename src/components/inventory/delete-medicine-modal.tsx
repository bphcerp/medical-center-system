import { useRouter } from "@tanstack/react-router";
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
import { handleErrors } from "@/lib/utils";
import { client } from "@/routes/api/$";

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
	const router = useRouter();

	if (!medicine || !inventoryId) return;

	const handleDelete = async () => {
		const res = await client.api.inventory.medicine.$delete({
			json: { inventoryMedicineId: inventoryId },
		});
		const data = await handleErrors(res);
		if (!data) {
			return;
		}

		await router.invalidate();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<div className="mb-3">Delete medicine?</div>
						<div className="text-lg font-medium space-x-2">
							<span>
								{medicine.company} {medicine.brand}
							</span>
							<span className="text-muted-foreground">
								({medicine.drug}) - {medicine.strength}
							</span>
							<span className="text-base py-1 px-2 rounded-sm bg-primary/10 text-primary">
								{medicine.type}
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
