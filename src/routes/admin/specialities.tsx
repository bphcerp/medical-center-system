import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Plus, Stethoscope } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { handleErrors } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/admin/specialities")({
	component: DoctorManagement,
	loader: async () => {
		const specialitiesRes = await client.api.doctor.speciality.all.$get();
		const specialities = await handleErrors(specialitiesRes);
		return {
			specialities: specialities ?? [],
		};
	},
	staticData: {
		icon: Stethoscope,
		name: "Doctor Specialities",
	},
});

function DoctorManagement() {
	const { specialities } = Route.useLoaderData();
	const router = useRouter();

	const handleCreateSpeciality = async (
		name: string,
		description: string | undefined,
	) => {
		const res = await client.api.doctor.speciality.$post({
			json: { name, description },
		});
		const data = await handleErrors(res);
		if (!data) return;
		router.invalidate();
	};

	return (
		<div>
			<h1 className="flex text-2xl font-bold mb-4 gap-4">
				Doctor Specialities
				<CreateSpecialityButton onCreate={handleCreateSpeciality} />
			</h1>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Description</TableHead>
						<TableHead>Status</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{specialities.map((sp) => (
						<TableRow key={sp.id}>
							<TableCell className="font-medium">{sp.name}</TableCell>
							<TableCell className="text-muted-foreground">
								{sp.description ?? "—"}
							</TableCell>
							<TableCell>
								{sp.isActive ? (
									<span className="text-green-600 font-medium">Active</span>
								) : (
									<span className="text-muted-foreground">Inactive</span>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
function CreateSpecialityButton({
	onCreate,
}: {
	onCreate: (name: string, description: string | undefined) => Promise<void>;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const scNameId = useId();
	const scDescId = useId();

	const handleSubmit = async (e: FormData) => {
		const name = e.get("name") as string | null;
		if (!name) return;
		const raw = e.get("description") as string;
		const description = raw.trim() || undefined;

		await onCreate(name, description);
		setIsOpen(false);
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="card" className="border-primary text-primary">
					<Plus /> Create
				</Button>
			</DialogTrigger>
			<DialogContent showCloseButton={false} className="gap-4">
				<DialogTitle>Create speciality</DialogTitle>
				<DialogDescription>
					Add a new speciality that doctors can be assigned to.
				</DialogDescription>
				<form action={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="sc-name">Name</Label>
						<Input
							id={scNameId}
							name="name"
							placeholder="e.g. Cardiology"
							required
							autoFocus
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="sc-description">
							Description{" "}
							<span className="text-muted-foreground font-normal">
								(optional)
							</span>
						</Label>
						<Textarea
							id={scDescId}
							name="description"
							placeholder="Brief description of this speciality"
							rows={3}
						/>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<Button type="submit">Create</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
