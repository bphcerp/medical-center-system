import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
	Loader2Icon,
	Plus,
	PlusIcon,
	Stethoscope,
	UserRound,
} from "lucide-react";
import {
	type FormEvent,
	type PropsWithChildren,
	useEffect,
	useId,
	useState,
} from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { doctorAvailabilityTypeEnum } from "@/db/doctor";
import type { Day } from "@/lib/types/day";
import { formatTime12, handleErrors } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/admin/doctor-management")({
	component: DoctorManagement,
	loader: async () => {
		const [doctorsRes, specializationsRes, unassignedRes] = await Promise.all([
			client.api.doctor.all.$get(),
			client.api.doctor.speciality.all.$get(),
			client.api.doctor.unassigned.$get(),
		]);
		const specializations = await handleErrors(specializationsRes);
		const doctors = await handleErrors(doctorsRes);
		const unassigned = await handleErrors(unassignedRes);
		return {
			doctors: doctors ?? [],
			specializations: specializations ?? [],
			unassignedDoctors: unassigned ?? [],
		};
	},
	staticData: {
		icon: Stethoscope,
		name: "Doctor Management",
	},
});

function DoctorManagement() {
	const { specializations, doctors, unassignedDoctors } = Route.useLoaderData();
	const router = useRouter();

	const handleCreateCategory = async (
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

	const handleAssignDoctor = async (
		doctorId: number,
		specialityId: number,
		availabilityType: (typeof doctorAvailabilityTypeEnum.enumValues)[number],
	) => {
		const res = await client.api.doctor[":doctorId"].$post({
			param: { doctorId: doctorId.toString() },
			json: { specialityId, availabilityType },
		});
		const data = await handleErrors(res);
		if (!data) return;
		router.invalidate();
	};

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
							{specializations.map((sp) => (
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
				</TabsContent>

				<TabsContent
					value="manage-doctors"
					className="flex flex-col gap-6 pt-2"
				>
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
											categories={specializations}
											onAssign={(specialityId, doctorType) =>
												handleAssignDoctor(doctor.id, specialityId, doctorType)
											}
										/>
									</div>
								))}
							</div>
						</section>
					)}

					{specializations.map((sp) => {
						const assignedDoctors = doctors.filter(
							(d) => d.specialityId === sp.id,
						);

						return (
							<section key={sp.id}>
								<div className="flex items-center gap-3 mb-3">
									<h2 className="text-base font-semibold">{sp.name}</h2>
								</div>
								{assignedDoctors.length === 0 ? (
									<p className="text-muted-foreground text-sm italic pl-1">
										No doctors assigned
									</p>
								) : (
									<div className="flex flex-col gap-2">
										{assignedDoctors.map((doctor) => (
											<div
												key={doctor.id}
												className="flex items-center justify-between rounded-lg border px-4 py-2.5"
											>
												<div className="flex items-center gap-3">
													<UserRound className="text-muted-foreground size-5" />
													<span className="font-medium">{doctor.name}</span>
													<span className="text-muted-foreground text-xs capitalize border rounded-full px-2 py-0.5">
														{doctor.availabilityType}
													</span>
												</div>
												<EditScheduleDialog
													doctorId={doctor.id}
													doctorName={doctor.name}
													categoryName={doctor.specialityName}
												/>
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

type SlotEntry = {
	key: string;
	startTime: string;
	endTime: string;
	slotDurationMinutes: number;
};

const DAY_ROWS: Day[][] = [
	["monday", "tuesday", "wednesday", "thursday"],
	["friday", "saturday", "sunday"],
];

export function EditScheduleDialog({
	doctorId,
	doctorName,
	categoryName,
	children,
}: PropsWithChildren<{
	doctorId: number;
	doctorName: string;
	categoryName: string;
}>) {
	const [isOpen, setIsOpen] = useState(false);
	const [slots, setSlots] = useState<Record<string, SlotEntry[]>>({});
	const [addingDay, setAddingDay] = useState<string | null>(null);
	const [addForm, setAddForm] = useState({
		startTime: "",
		endTime: "",
		slotDurationMinutes: 15,
	});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		client.api.doctor[":doctorId"].schedule
			.$get({ param: { doctorId: doctorId.toString() } })
			.then((res) => handleErrors(res))
			.then((data) => {
				if (!data) return;
				const grouped: Record<string, SlotEntry[]> = {};
				for (const t of data) {
					if (!grouped[t.dayOfWeek]) grouped[t.dayOfWeek] = [];
					grouped[t.dayOfWeek].push({
						key: crypto.randomUUID(),
						startTime: t.startTime.slice(0, 5),
						endTime: t.endTime.slice(0, 5),
						slotDurationMinutes: t.slotDurationMinutes,
					});
				}
				setSlots(grouped);
			});
	}, [isOpen, doctorId]);

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) {
			setSlots({});
			setAddingDay(null);
			setAddForm({ startTime: "", endTime: "", slotDurationMinutes: 15 });
		}
	};

	const handleAddSlot = (day: string) => {
		if (!addForm.startTime || !addForm.endTime) return;
		setSlots((prev) => ({
			...prev,
			[day]: [...(prev[day] ?? []), { key: crypto.randomUUID(), ...addForm }],
		}));
		setAddingDay(null);
		setAddForm({ startTime: "", endTime: "", slotDurationMinutes: 15 });
	};

	const handleRemoveSlot = (day: string, key: string) => {
		setSlots((prev) => ({
			...prev,
			[day]: (prev[day] ?? []).filter((s) => s.key !== key),
		}));
	};

	const handleSave = async () => {
		setSaving(true);

		const allSlots = Object.entries(slots).flatMap(([day, daySlots]) =>
			daySlots.map((s) => ({
				dayOfWeek: day as Day,
				startTime: s.startTime,
				endTime: s.endTime,
				slotDurationMinutes: s.slotDurationMinutes,
			})),
		);
		const res = await client.api.doctor[":doctorId"].schedule.$put({
			param: { doctorId: doctorId.toString() },
			json: { slots: allSlots },
		});
		await handleErrors(res);

		setSaving(false);

		setIsOpen(false);
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				{children ?? (
					<Button variant="outline" size="sm">
						Edit Schedule
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-4xl gap-6">
				<div>
					<p className="text-muted-foreground text-xs italic mb-0.5">
						Editing schedule for
					</p>
					<DialogTitle className="text-xl">{doctorName}</DialogTitle>
					<p className="text-muted-foreground text-sm mt-0.5">{categoryName}</p>
				</div>

				<div className="flex flex-col gap-4">
					{DAY_ROWS.map((row) => (
						<div
							key={row.join("-")}
							className="grid gap-px bg-border border rounded-lg overflow-hidden"
							style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}
						>
							{row.map((day) => {
								const daySlots = slots[day] ?? [];
								const isAdding = addingDay === day;

								return (
									<div key={day} className="bg-background flex flex-col">
										<div className="bg-muted/50 text-center py-2 font-medium text-sm capitalize border-b">
											{day.charAt(0).toUpperCase() + day.slice(1)}
										</div>
										<div className="flex flex-col gap-1 p-2 flex-1">
											{daySlots.map((slot) => (
												<div
													key={slot.key}
													className="group flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1.5 gap-1"
												>
													<span className="tabular-nums">
														{formatTime12(slot.startTime)} –{" "}
														{formatTime12(slot.endTime)}
													</span>
													<button
														type="button"
														onClick={() => handleRemoveSlot(day, slot.key)}
														className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
													>
														×
													</button>
												</div>
											))}

											{isAdding ? (
												<div className="flex flex-col gap-1.5 mt-1 pt-1 border-t">
													<Input
														type="time"
														value={addForm.startTime}
														onChange={(e) =>
															setAddForm((f) => ({
																...f,
																startTime: e.target.value,
															}))
														}
														className="text-xs px-1.5 w-full h-8"
													/>
													<Input
														type="time"
														value={addForm.endTime}
														onChange={(e) =>
															setAddForm((f) => ({
																...f,
																endTime: e.target.value,
															}))
														}
														className="text-xs px-1.5 w-full h-8"
													/>
													<div className="flex items-center gap-1">
														<Input
															type="number"
															min={5}
															step={5}
															value={addForm.slotDurationMinutes}
															onChange={(e) =>
																setAddForm((f) => ({
																	...f,
																	slotDurationMinutes: Number(e.target.value),
																}))
															}
															className="text-xs px-1.5 w-full h-8"
														/>
														<span className="text-xs text-muted-foreground whitespace-nowrap">
															min
														</span>
													</div>
													<div className="flex gap-1">
														<Button
															type="button"
															size="sm"
															onClick={() => handleAddSlot(day)}
															disabled={!addForm.startTime || !addForm.endTime}
															className="flex-1 text-xs"
														>
															Add
														</Button>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() => setAddingDay(null)}
															className="flex-1 text-xs"
														>
															Cancel
														</Button>
													</div>
												</div>
											) : (
												<Button
													type="button"
													variant="ghost"
													onClick={() => {
														setAddingDay(day);
														setAddForm({
															startTime: "",
															endTime: "",
															slotDurationMinutes: 15,
														});
													}}
													className="mt-1 text-muted-foreground hover:text-foreground text-base self-center leading-none py-1 w-full"
												>
													<PlusIcon />
												</Button>
											)}
										</div>
									</div>
								);
							})}
						</div>
					))}
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button onClick={handleSave} disabled={saving}>
						{saving ? (
							<Loader2Icon className="animate-spin" />
						) : (
							<span>Save</span>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
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
				<DialogTitle>Create specialist category</DialogTitle>
				<DialogDescription>
					Add a new specialist category that doctors can be assigned to.
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
