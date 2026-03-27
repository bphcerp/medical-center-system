import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
	Calendar,
	FilterIcon,
	PlusIcon,
	Search,
	ShieldUser,
	Stethoscope,
	XIcon,
} from "lucide-react";
import { type PropsWithChildren, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
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
import { handleErrors, titleCase } from "@/lib/utils";
import { client } from "../api/$";
import { EditScheduleDialog } from "./doctor-management";

export const Route = createFileRoute("/admin/user")({
	component: Admin,
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

function Admin() {
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

		const res = await client.api.doctor[":doctorId"].$post({
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
				<h1 className="font-bold text-2xl">Manage Staff</h1>
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
													categoryName={"bluah"}
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
