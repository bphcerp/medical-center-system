import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Plus, Stethoscope, UserRound } from "lucide-react";
import { type FormEvent, useState } from "react";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import { handleErrors } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/admin/doctor-management")({
	component: DoctorManagement,
	loader: async () => {
		const [categoriesRes, doctorsRes] = await Promise.all([
			client.api.admin["specialist-categories"].$get(),
			client.api.admin["doctors-with-assignments"].$get(),
		]);
		const categoriesData = await handleErrors(categoriesRes);
		const doctorsData = await handleErrors(doctorsRes);
		return {
			categories: categoriesData ?? [],
			doctors: doctorsData?.doctors ?? [],
			assignments: doctorsData?.assignments ?? [],
		};
	},
	staticData: {
		icon: Stethoscope,
		name: "Doctor Management",
	},
});

function DoctorManagement() {
	const { categories, doctors, assignments } = Route.useLoaderData();
	const router = useRouter();

	const handleCreateCategory = async (
		name: string,
		description: string | undefined,
	) => {
		const res = await client.api.admin["specialist-categories"].$post({
			json: { name, description },
		});
		const data = await handleErrors(res);
		if (!data) return;
		router.invalidate();
	};

	const handleAssignDoctor = async (
		doctorId: number,
		categoryId: number,
		doctorType: "campus" | "visiting",
	) => {
		const res = await client.api.admin["doctor-assignments"].$post({
			json: { doctorId, categoryId, doctorType },
		});
		const data = await handleErrors(res);
		if (!data) return;
		router.invalidate();
	};

	const assignedDoctorIds = new Set(assignments.map((a) => a.doctorId));
	const unassignedDoctors = doctors.filter((d) => !assignedDoctorIds.has(d.id));

	return (
		<div>
			<h1 className="text-2xl font-semibold mb-4">Doctor Management</h1>
			<Tabs defaultValue="specialist-categories">
				<TabsList>
					<TabsTrigger value="specialist-categories">
						Specialist Categories
					</TabsTrigger>
					<TabsTrigger value="manage-doctors">Manage Doctors</TabsTrigger>
				</TabsList>

				<TabsContent value="specialist-categories">
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-lg font-semibold">Specialist Categories</h2>
						<CreateCategoryButton onCreate={handleCreateCategory} />
					</div>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Description</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{categories.map((category) => (
								<TableRow key={category.id}>
									<TableCell className="font-medium">{category.name}</TableCell>
									<TableCell className="text-muted-foreground">
										{category.description ?? "—"}
									</TableCell>
									<TableCell>
										{category.isActive ? (
											<span className="text-green-600 font-medium">Active</span>
										) : (
											<span className="text-muted-foreground">Inactive</span>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TabsContent>

				<TabsContent value="manage-doctors" className="flex flex-col gap-6 pt-2">
					{unassignedDoctors.length > 0 && (
						<section>
							<h2 className="text-base font-semibold mb-3 text-destructive">
								Unassigned Doctors
							</h2>
							<div className="flex flex-col gap-2">
								{unassignedDoctors.map((doctor) => (
									<div
										key={doctor.id}
										className="flex items-center justify-between rounded-lg border px-4 py-2.5"
									>
										<div className="flex items-center gap-3">
											<UserRound className="text-muted-foreground size-5" />
											<span className="font-medium">{doctor.name}</span>
										</div>
										<AssignCategoryDialog
											doctor={doctor}
											categories={categories}
											onAssign={(categoryId, doctorType) =>
												handleAssignDoctor(doctor.id, categoryId, doctorType)
											}
										/>
									</div>
								))}
							</div>
						</section>
					)}

					{categories.map((category) => {
						const categoryAssignments = assignments.filter(
							(a) => a.categoryId === category.id,
						);
						const assignedDoctors = categoryAssignments.map((a) => ({
							...a,
							doctor: doctors.find((d) => d.id === a.doctorId),
						}));

						return (
							<section key={category.id}>
								<div className="flex items-center gap-3 mb-3">
									<h2 className="text-base font-semibold">{category.name}</h2>
								</div>
								{assignedDoctors.length === 0 ? (
									<p className="text-muted-foreground text-sm italic pl-1">
										No doctors assigned
									</p>
								) : (
									<div className="flex flex-col gap-2">
										{assignedDoctors.map((a) => (
											<div
												key={a.assignmentId}
												className="flex items-center justify-between rounded-lg border px-4 py-2.5"
											>
												<div className="flex items-center gap-3">
													<UserRound className="text-muted-foreground size-5" />
													<span className="font-medium">
														{a.doctor?.name ?? "Unknown"}
													</span>
													<span className="text-muted-foreground text-xs capitalize border rounded-full px-2 py-0.5">
														{a.doctorType}
													</span>
												</div>
												<Button variant="outline" size="sm" disabled>
													Edit Schedule
												</Button>
											</div>
										))}
									</div>
								)}
							</section>
						);
					})}
				</TabsContent>
			</Tabs>
		</div>
	);
}

function AssignCategoryDialog({
	doctor,
	categories,
	onAssign,
}: {
	doctor: { id: number; name: string; username: string };
	categories: { id: number; name: string }[];
	onAssign: (
		categoryId: number,
		doctorType: "campus" | "visiting",
	) => Promise<void>;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [categoryId, setCategoryId] = useState<string>("");
	const [doctorType, setDoctorType] = useState<string>("");

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!categoryId || !doctorType) return;
		await onAssign(Number(categoryId), doctorType as "campus" | "visiting");
		setIsOpen(false);
		setCategoryId("");
		setDoctorType("");
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					Assign to Category
				</Button>
			</DialogTrigger>
			<DialogContent showCloseButton={false} className="gap-4">
				<DialogTitle>Assign {doctor.name} to a category</DialogTitle>
				<DialogDescription>
					Choose a specialist category and doctor type for{" "}
					<span className="font-medium">@{doctor.username}</span>.
				</DialogDescription>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label>Category</Label>
						<Select value={categoryId} onValueChange={setCategoryId} required>
							<SelectTrigger>
								<SelectValue placeholder="Select a category" />
							</SelectTrigger>
							<SelectContent>
								{categories.map((c) => (
									<SelectItem key={c.id} value={String(c.id)}>
										{c.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>Doctor Type</Label>
						<Select value={doctorType} onValueChange={setDoctorType} required>
							<SelectTrigger>
								<SelectValue placeholder="Select doctor type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="campus">Campus</SelectItem>
								<SelectItem value="visiting">Visiting</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline" type="button">
								Cancel
							</Button>
						</DialogClose>
						<Button type="submit" disabled={!categoryId || !doctorType}>
							Assign
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function CreateCategoryButton({
	onCreate,
}: {
	onCreate: (name: string, description: string | undefined) => Promise<void>;
}) {
	const [isOpen, setIsOpen] = useState(false);

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
				<DialogTitle>Create specialist category</DialogTitle>
				<DialogDescription>
					Add a new specialist category that doctors can be assigned to.
				</DialogDescription>
				<form action={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="sc-name">Name</Label>
						<Input
							id="sc-name"
							name="name"
							placeholder="e.g. Cardiology"
							required
							autoFocus
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="sc-description">
							Description{" "}
							<span className="text-muted-foreground font-normal">(optional)</span>
						</Label>
						<Textarea
							id="sc-description"
							name="description"
							placeholder="Brief description of this specialty"
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
