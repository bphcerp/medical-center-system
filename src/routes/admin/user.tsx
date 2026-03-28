import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
	Calendar,
	FilterIcon,
	Loader2Icon,
	Plus,
	PlusIcon,
	Search,
	ShieldUser,
	Stethoscope,
	XIcon,
} from "lucide-react";
import {
	type PropsWithChildren,
	useEffect,
	useId,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";
import type { Day } from "src/lib/types/day";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Field,
	FieldContent,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
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
	type DoctorAvailabilityType,
	doctorAvailabilityTypes,
} from "@/db/doctor";
import useAuth from "@/lib/hooks/useAuth";
import { formatTime12, handleErrors, titleCase } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/admin/user")({
	component: User,
	loader: async () => {
		const usersRes = await client.api.user.all.$get();
		const rolesRes = await client.api.role.all.$get();
		const specialitiesRes = await client.api.doctor.speciality.all.$get();

		const users = (await handleErrors(usersRes)) ?? [];
		const roles = (await handleErrors(rolesRes)) ?? [];
		const specialities = (await handleErrors(specialitiesRes)) ?? [];

		return { roles, specialities, users };
	},
	staticData: {
		icon: ShieldUser,
		name: "Manage Staff",
	},
});

type Filter = {
	name?: string;
	roleIds: Set<number>;
};

type NewSpeciality = { name: string; description: string | null };
type ExistingSpeciality = { id: number };

function User() {
	useAuth(["admin"]);

	const router = useRouter();
	const { users: allUsers, roles, specialities } = Route.useLoaderData();
	const [filter, setFilter] = useState<Filter>({ roleIds: new Set() });

	const users = useMemo(() => {
		let filtered = allUsers;

		if (filter.roleIds.size > 0) {
			filtered = filtered.filter((user) => filter.roleIds.has(user.role));
		}

		if (filter.name) {
			const query = filter.name.toLowerCase();
			filtered = filtered.filter(
				(user) =>
					user.name.toLowerCase().includes(query) ||
					user.username.toLowerCase().includes(query),
			);
		}

		return filtered;
	}, [allUsers, filter]);

	const handleRoleChange = async (userId: number, roleId: number) => {
		const res = await client.api.user[":id"].$post({
			param: { id: userId.toString() },
			json: { role: roleId },
		});

		const data = await handleErrors(res);
		await router.invalidate();
		return !!data;
	};

	const createSpeciality = async (speciality: NewSpeciality) => {
		const res = await client.api.doctor.speciality.$post({
			json: {
				name: speciality.name,
				description:
					speciality.description === null ? undefined : speciality.description,
			},
		});

		return await handleErrors(res);
	};

	const handleAssignDoctor = async (
		doctorId: number,
		speciality: NewSpeciality | ExistingSpeciality,
		availabilityType: DoctorAvailabilityType,
	) => {
		const data =
			"name" in speciality ? await createSpeciality(speciality) : speciality;

		if (!data) return;

		const res = await client.api.doctor.assign[":doctorId"].$post({
			param: { doctorId: doctorId.toString() },
			json: { specialityId: data.id, availabilityType },
		});

		const result = await handleErrors(res);
		if (result) {
			router.invalidate();
		}
	};

	return (
		<>
			<div className="flex flex-wrap items-center gap-4 justify-between mb-3">
				<span className="flex gap-4">
					<h1 className="text-2xl font-bold inline">Manage Staff</h1>
					<AddUserButton />
				</span>
				<div className="flex gap-4 items-center">
					<div className="flex">
						<InputGroup className="w-80">
							<InputGroupAddon>
								<Search />
							</InputGroupAddon>
							<InputGroupInput
								type="search"
								placeholder="Search by name or username"
								onChange={(e) =>
									setFilter((filter) => ({ ...filter, name: e.target.value }))
								}
							/>
						</InputGroup>
					</div>
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline">
								{filter.roleIds.size > 0 ? (
									<Badge
										className="text-xs rounded-full aspect-square tabular-nums p-1.5"
										variant="secondary"
									>
										{filter.roleIds.size}
									</Badge>
								) : (
									<FilterIcon />
								)}{" "}
								Role
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="bg-background w-48">
							<RoleFilter
								roles={roles}
								selected={filter.roleIds}
								onChanged={(ids) =>
									setFilter((filter) => ({ ...filter, roleIds: ids }))
								}
							/>
						</PopoverContent>
					</Popover>
				</div>
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-1/5 whitespace-break-spaces">
							Member
						</TableHead>
						<TableHead className="w-1/5">Role</TableHead>
						<TableHead className="w-3/5" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{users.map((user) => {
						return (
							<TableRow key={user.username}>
								<TableCell className="whitespace-break-spaces flex flex-col">
									<span className="font-medium text-base">{user.name}</span>
									<span className="text-muted-foreground text-xs">
										{user.username}
									</span>
								</TableCell>
								<TableCell>
									<RoleSelect
										role={user.role.toString()}
										roles={roles}
										setRole={(id) => handleRoleChange(user.id, id)}
									/>
								</TableCell>
								<TableCell className={user.isDoctor ? "border-l" : ""}>
									{user.isDoctor && (
										<div className="flex gap-4 items-center justify-between">
											{user.assignedDoctor ? (
												<div className="flex flex-col">
													{user.speciality && (
														<span className="text-base">
															{user.speciality.name}
														</span>
													)}
													{user && (
														<span className="text-muted-foreground text-xs">
															{titleCase(user.assignedDoctor?.availabilityType)}
														</span>
													)}
												</div>
											) : (
												<span className="text-destructive text-base font-medium">
													No specialization assigned
												</span>
											)}
											<ButtonGroup>
												<DoctorSpecialityDialog
													onSubmit={(speciality, availabilityType) =>
														handleAssignDoctor(
															user.id,
															speciality,
															availabilityType,
														)
													}
													specialities={specialities}
													doctor={user}
												>
													<Button
														size="sm"
														variant="outline"
														className={
															user.assignedDoctor
																? ""
																: "animate-pulse border-primary"
														}
													>
														<Stethoscope /> Specialization
													</Button>
												</DoctorSpecialityDialog>
												<EditScheduleDialog
													doctorId={user.id}
													doctorName={user.name}
													specialityName={"bluah"}
												>
													<Button variant="outline" size="sm">
														<Calendar /> Schedule
													</Button>
												</EditScheduleDialog>
											</ButtonGroup>
										</div>
									)}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</>
	);
}

function RoleFilter({
	roles,
	selected,
	onChanged,
}: {
	roles: typeof Route.types.loaderData.roles;
	selected: Set<number>;
	onChanged: (selected: Set<number>) => void;
}) {
	return (
		<FieldSet>
			<FieldLegend>Filter by Role</FieldLegend>
			<FieldGroup className="gap-3">
				{roles.map((role) => (
					<Field
						key={role.id}
						orientation="horizontal"
						className="*:cursor-pointer"
					>
						<Checkbox
							checked={selected.has(role.id)}
							id={`role-${role.id}`}
							className="border-2 size-5"
							variant="secondary"
							onCheckedChange={(e) => {
								const newSet = new Set(selected);
								if (e) {
									newSet.add(role.id);
								} else {
									newSet.delete(role.id);
								}
								onChanged(newSet);
							}}
						/>
						<FieldLabel htmlFor={`role-${role.id}`} className="font-normal">
							{role.name}
						</FieldLabel>
					</Field>
				))}
				<Button
					variant="secondary"
					size="sm"
					disabled={selected.size === 0}
					onClick={() => onChanged(new Set())}
				>
					Clear
				</Button>
			</FieldGroup>
		</FieldSet>
	);
}

function RoleSelect({
	role,
	roles,
	setRole,
}: {
	role: string;
	roles: typeof Route.types.loaderData.roles;
	setRole: (roleId: number) => Promise<boolean>;
}) {
	const [roleId, setRoleId] = useState(role);
	const [eagerRoleId, setEagerRoleId] = useState(role);

	const handleSetRole = async (newRoleId: string) => {
		setEagerRoleId(newRoleId);
		const success = await setRole(Number(newRoleId));
		if (success) {
			setRoleId(newRoleId);
		} else {
			// change this to some toast thing in the future
			setEagerRoleId(roleId);
			toast.error("Failed to update role");
		}
	};

	return (
		<div className="flex gap-2">
			<Select value={eagerRoleId} onValueChange={handleSetRole}>
				<SelectTrigger size="sm" className="w-full focus-visible:ring-0">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectLabel>Roles</SelectLabel>
						{roles.map((r) => (
							<SelectItem key={r.id} value={r.id.toString()}>
								{r.name}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}

function DoctorSpecialityDialog({
	specialities,
	doctor,
	onSubmit,
	children,
}: PropsWithChildren<{
	specialities: typeof Route.types.loaderData.specialities;
	doctor: (typeof Route.types.loaderData.users)[number];
	onSubmit?: (
		speciality: NewSpeciality | ExistingSpeciality,
		availabilityType: DoctorAvailabilityType,
	) => Promise<void>;
}>) {
	const [isOpen, setIsOpen] = useState(false);

	const handleSubmit = async (formData: FormData) => {
		const specialityId = formData.get("specialityId");
		const specialityName = formData.get("specialityName");
		const specialityDescription = formData.get("specialityDescription");

		const availabilityType = formData.get("availabilityType");

		if (specialityName !== null) {
			await onSubmit?.(
				{
					name: specialityName as string,
					description: specialityDescription as string | null,
				},
				availabilityType as DoctorAvailabilityType,
			);
		} else {
			await onSubmit?.(
				{ id: Number(specialityId) },
				availabilityType as DoctorAvailabilityType,
			);
		}

		setIsOpen(false);
	};

	return (
		<Dialog modal open={isOpen}>
			<DialogTrigger asChild onClick={() => setIsOpen(true)}>
				{children}
			</DialogTrigger>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>Edit Doctor Information</DialogTitle>
					<DialogDescription>
						Assign specialization and availability for{" "}
						<strong>{doctor.name}</strong>
					</DialogDescription>
				</DialogHeader>
				<form action={handleSubmit} className="flex flex-col flex-1 space-y-4">
					<FieldGroup className="gap-4">
						<SpecialityField
							defaultSpeciality={doctor.speciality}
							specialities={specialities}
						/>
						<FieldSet>
							<FieldLegend variant="label">Availability</FieldLegend>
							<RadioGroup
								name="availabilityType"
								defaultValue={doctor.assignedDoctor?.availabilityType}
								className="flex"
								required
							>
								{doctorAvailabilityTypes.map((type) => (
									<FieldLabel
										key={type}
										htmlFor={`availability-${type}`}
										className="cursor-pointer border-4"
									>
										<Field orientation="horizontal">
											<FieldContent>
												<FieldTitle>{titleCase(type)}</FieldTitle>
											</FieldContent>
											<RadioGroupItem
												value={type}
												id={`availability-${type}`}
											/>
										</Field>
									</FieldLabel>
								))}
							</RadioGroup>
						</FieldSet>
					</FieldGroup>

					<DialogFooter>
						<Button
							variant="outline"
							type="reset"
							onClick={() => setIsOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" className="min-w-10">
							Save
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

type Speciality = (typeof Route.types.loaderData.specialities)[number];

function SpecialityField({
	specialities,
	defaultSpeciality,
}: {
	defaultSpeciality: Speciality | null;
	specialities: Speciality[];
}) {
	const [isAdding, setIsAdding] = useState(false);

	return (
		<FieldSet>
			{isAdding ? (
				<div className="flex flex-col gap-4 bg-primary/4 p-4 rounded-md border-2 border-primary border-dashed">
					<h2 className="font-semibold text-base flex justify-between">
						Create new specialization
						<Button
							type="button"
							size="icon"
							variant="outline"
							onClick={() => setIsAdding(false)}
							className="self-end font-normal size-7 p-0"
						>
							<XIcon strokeWidth={3} />
						</Button>
					</h2>
					<FieldGroup className="gap-4">
						<Field>
							<FieldLabel className="leading-none">
								Specialization Name
							</FieldLabel>
							<Input
								name="specialityName"
								className="h-8"
								placeholder="e.g. Cardiology"
								required
							/>
						</Field>
						<Field>
							<FieldLabel className="leading-none">
								Specialization Description
							</FieldLabel>
							<Textarea
								name="specialityDescription"
								placeholder="Brief description of this specialization"
							/>
						</Field>
					</FieldGroup>
				</div>
			) : (
				<>
					<FieldLegend variant="label">Specialization</FieldLegend>
					<div className="flex gap-2">
						<Select
							name="specialityId"
							defaultValue={defaultSpeciality?.id.toString()}
							required
						>
							<SelectTrigger className="flex-1">
								<SelectValue placeholder="Select Specialization" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>Specializations</SelectLabel>
									{specialities.map((s) => (
										<SelectItem key={s.id} value={s.id.toString()}>
											{s.name}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							size="icon"
							type="button"
							onClick={() => setIsAdding((v) => !v)}
						>
							{isAdding ? <XIcon /> : <PlusIcon />}
						</Button>
					</div>
				</>
			)}
		</FieldSet>
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

// TODO: improve this UI
function EditScheduleDialog({
	doctorId,
	doctorName,
	specialityName,
	children,
}: PropsWithChildren<{
	doctorId: number;
	doctorName: string;
	specialityName: string;
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
					<p className="text-muted-foreground text-sm mt-0.5">
						{specialityName}
					</p>
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

function AddUserButton() {
	const nameId = useId();
	const usernameId = useId();
	const emailId = useId();
	const passwordId = useId();
	const router = useRouter();

	const [open, setOpen] = useState(false);

	const handleAddUser = async (formData: FormData) => {
		const name = formData.get("name") as string;
		const username = formData.get("username") as string;
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		const res = await client.api.signup.$post({
			json: { name, username, email, password },
		});
		const data = await handleErrors(res);
		if (data) {
			await router.invalidate();
			setOpen(false);
			toast.success("User created successfully");
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="h-9">
					<Plus /> Add User
				</Button>
			</DialogTrigger>

			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add User</DialogTitle>
				</DialogHeader>
				<form className="space-y-4" action={handleAddUser}>
					<FieldSet>
						<FieldGroup className="gap-4">
							<Field>
								<FieldLabel htmlFor={nameId}>Name</FieldLabel>
								<Input
									name="name"
									type="text"
									placeholder="Full name"
									required
								/>
							</Field>

							<Field>
								<FieldLabel htmlFor={emailId}>Email</FieldLabel>
								<Input
									name="email"
									type="email"
									placeholder="user@example.com"
									required
								/>
							</Field>

							<Field>
								<FieldLabel htmlFor={usernameId}>Username</FieldLabel>
								<Input
									name="username"
									type="text"
									placeholder="Username"
									required
								/>
							</Field>

							<Field>
								<FieldLabel htmlFor={passwordId}>Password</FieldLabel>
								<Input
									id={passwordId}
									name="password"
									type="password"
									placeholder="Password"
									required
								/>
							</Field>
						</FieldGroup>
					</FieldSet>

					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</DialogClose>
						<Button type="submit">Create User</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
