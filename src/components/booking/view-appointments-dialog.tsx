import { useRouter } from "@tanstack/react-router";
import { format, isToday } from "date-fns";
import { CalendarIcon, RefreshCw } from "lucide-react";
import {
	type PropsWithChildren,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { cn, formatTime12, handleErrors } from "@/lib/utils";
import { client } from "@/routes/api/$";

type AppointmentRow = {
	id: number;
	patientName: string;
	doctorName: string;
	appointmentDate: string;
	slotStart: string;
	slotEnd: string;
	status: "scheduled" | "cancelled" | "completed" | "no_show";
	tokenNumber: number | null;
};

type AppointmentsResponse = {
	appointments: AppointmentRow[];
	total: number;
	limit: number;
	offset: number;
};

type DoctorOption = {
	id: number;
	name: string;
};

type StatusFilter = "all" | "scheduled" | "cancelled" | "completed" | "no_show";

type FilterState = {
	search: string;
	statusFilter: StatusFilter;
	doctorFilter: string;
	dateFilter: string;
};

const statusClasses: Record<AppointmentRow["status"], string> = {
	scheduled:
		"bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700",
	completed:
		"bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700",
	cancelled:
		"bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700",
	no_show:
		"bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700",
};

export default function ViewAppointmentsDialog({
	children,
	open: controlledOpen,
	onOpenChange,
}: PropsWithChildren<{
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}>) {
	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [doctors, setDoctors] = useState<DoctorOption[]>([]);
	const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
	const [updatingAppointmentId, setUpdatingAppointmentId] = useState<
		number | null
	>(null);
	const [total, setTotal] = useState(0);
	const [offset, setOffset] = useState(0);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [doctorFilter, setDoctorFilter] = useState("all");
	const [dateFilter, setDateFilter] = useState("");
	const router = useRouter();
	const open = controlledOpen ?? internalOpen;
	const hasTrigger = useMemo(() => children !== undefined, [children]);

	const limit = 10;

	const loadAppointments = useCallback(
		async (nextOffset = offset, overrides?: Partial<FilterState>) => {
			const effectiveSearch = overrides?.search ?? search;
			const effectiveStatus = overrides?.statusFilter ?? statusFilter;
			const effectiveDoctor = overrides?.doctorFilter ?? doctorFilter;
			const effectiveDate = overrides?.dateFilter ?? dateFilter;

			setLoading(true);
			const res = await client.api.booking.appointments.$get({
				query: {
					...(effectiveStatus !== "all" ? { status: effectiveStatus } : {}),
					...(effectiveDoctor !== "all"
						? { doctorId: Number(effectiveDoctor) }
						: {}),
					...(effectiveDate ? { appointmentDate: effectiveDate } : {}),
					...(effectiveSearch.trim() ? { search: effectiveSearch.trim() } : {}),
					limit,
					offset: nextOffset,
				},
			});

			const data = (await handleErrors(res)) as AppointmentsResponse | null;
			setAppointments(data?.appointments ?? []);
			setTotal(data?.total ?? 0);
			setOffset(nextOffset);
			setLoading(false);
		},
		[search, statusFilter, doctorFilter, dateFilter, offset],
	);

	const loadDoctors = useCallback(async () => {
		const res = await client.api.doctor.all.$get();
		const data = (await handleErrors(res)) as DoctorOption[] | null;
		setDoctors(data ?? []);
	}, []);

	const handleStatusChange = async (
		appointmentId: number,
		currentStatus: AppointmentRow["status"],
		status: AppointmentRow["status"],
	) => {
		if (status === currentStatus) return;

		let cancellationReason: string | undefined;
		if (status === "cancelled") {
			const reason = window.prompt("Enter cancellation reason:", "");
			if (reason === null) return;

			const trimmedReason = reason.trim();
			if (!trimmedReason) {
				toast.error("Cancellation reason is required.");
				return;
			}

			cancellationReason = trimmedReason;
		}

		setUpdatingAppointmentId(appointmentId);
		const res = await client.api.booking.appointments[
			":appointmentId"
		].status.$patch({
			param: { appointmentId: appointmentId.toString() },
			json: {
				status,
				...(cancellationReason ? { cancellationReason } : {}),
			},
		});

		const data = await handleErrors(res);
		if (data) {
			const updateResult = data as {
				id: number;
				status: AppointmentRow["status"];
				queueToken?: number | null;
			};

			if (updateResult.status === "completed" && updateResult.queueToken) {
				toast.success(
					`Appointment completed. Added to reception queue #${updateResult.queueToken}.`,
				);
			} else {
				toast.success("Appointment status updated");
			}

			await loadAppointments(offset);
			await router.invalidate();
		}
		setUpdatingAppointmentId(null);
	};

	const handleResetFilters = () => {
		const resetFilters: FilterState = {
			search: "",
			statusFilter: "all",
			doctorFilter: "all",
			dateFilter: "",
		};

		setSearch("");
		setDebouncedSearch("");
		setStatusFilter("all");
		setDoctorFilter("all");
		setDateFilter("");
		loadAppointments(0, resetFilters);
	};

	useEffect(() => {
		if (!open) return;
		const timer = setTimeout(() => {
			setDebouncedSearch(search);
		}, 300);

		return () => clearTimeout(timer);
	}, [search, open]);

	useEffect(() => {
		if (!open) {
			setOffset(0);
			return;
		}
		loadDoctors();
		loadAppointments(0);
	}, [open, loadDoctors, loadAppointments]);

	useEffect(() => {
		if (!open) return;

		loadAppointments(0, {
			search: debouncedSearch,
			statusFilter,
			doctorFilter,
			dateFilter,
		});
	}, [
		debouncedSearch,
		statusFilter,
		doctorFilter,
		dateFilter,
		open,
		loadAppointments,
	]);

	const hasPrev = offset > 0;
	const hasNext = offset + limit < total;

	const renderDate = (appointmentDate: string) => {
		const date = new Date(`${appointmentDate}T00:00:00`);
		return isToday(date) ? "Today" : format(date, "d MMM yyyy");
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange?.(nextOpen);
				if (controlledOpen === undefined) {
					setInternalOpen(nextOpen);
				}
			}}
		>
			{hasTrigger && <DialogTrigger asChild>{children}</DialogTrigger>}
			<DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[95vw] h-[88dvh] flex flex-col">
				<DialogHeader className="sr-only">
					<DialogTitle>Appointments</DialogTitle>
					<DialogDescription>
						View and filter appointments with pagination controls.
					</DialogDescription>
				</DialogHeader>

				<div className="flex items-center justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold">Appointments</h2>
						<p className="text-sm text-muted-foreground">
							Showing {appointments.length} of {total}
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => loadAppointments(offset)}
						disabled={loading}
					>
						<RefreshCw className={cn("size-4", loading && "animate-spin")} />
						Refresh
					</Button>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-2 items-end">
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground">Search</p>
						<Input
							placeholder="Patient or doctor"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>

					<div className="space-y-1">
						<p className="text-xs text-muted-foreground">Status</p>
						<Select
							value={statusFilter}
							onValueChange={(value) => setStatusFilter(value as StatusFilter)}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="All statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="scheduled">Scheduled</SelectItem>
								<SelectItem value="completed">Completed</SelectItem>
								<SelectItem value="cancelled">Cancelled</SelectItem>
								<SelectItem value="no_show">No Show</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1">
						<p className="text-xs text-muted-foreground">Doctor</p>
						<Select value={doctorFilter} onValueChange={setDoctorFilter}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="All doctors" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								{doctors.map((doctor) => (
									<SelectItem key={doctor.id} value={doctor.id.toString()}>
										{doctor.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1">
						<p className="text-xs text-muted-foreground">Date</p>
						<Input
							type="date"
							value={dateFilter}
							onChange={(e) => setDateFilter(e.target.value)}
						/>
					</div>

					<Button
						variant="outline"
						onClick={handleResetFilters}
						disabled={loading}
					>
						Reset
					</Button>
				</div>

				{appointments.length === 0 && !loading ? (
					<Empty className="my-auto">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<CalendarIcon />
							</EmptyMedia>
							<EmptyTitle>No appointments found</EmptyTitle>
							<EmptyDescription>
								Try adjusting filters or clear them to see more appointments.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<ScrollArea className="flex-1 min-h-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Token</TableHead>
									<TableHead>Patient</TableHead>
									<TableHead>Doctor</TableHead>
									<TableHead>Date</TableHead>
									<TableHead>Time</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{appointments.map((appointment) => (
									<TableRow key={appointment.id}>
										<TableCell>{appointment.tokenNumber ?? "-"}</TableCell>
										<TableCell>{appointment.patientName}</TableCell>
										<TableCell>{appointment.doctorName}</TableCell>
										<TableCell>
											{renderDate(appointment.appointmentDate)}
										</TableCell>
										<TableCell>
											{formatTime12(appointment.slotStart)} -{" "}
											{formatTime12(appointment.slotEnd)}
										</TableCell>
										<TableCell>
											<Select
												value={appointment.status}
												onValueChange={(value) =>
													handleStatusChange(
														appointment.id,
														appointment.status,
														value as AppointmentRow["status"],
													)
												}
												disabled={
													loading || updatingAppointmentId === appointment.id
												}
											>
												<SelectTrigger
													size="sm"
													className={cn(
														"w-[140px] capitalize",
														statusClasses[appointment.status],
													)}
												>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="scheduled">Scheduled</SelectItem>
													<SelectItem value="completed">Completed</SelectItem>
													<SelectItem value="cancelled">Cancelled</SelectItem>
													<SelectItem value="no_show">No Show</SelectItem>
												</SelectContent>
											</Select>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</ScrollArea>
				)}

				<div className="flex justify-between items-center gap-3 pt-3 border-t">
					<p className="text-sm text-muted-foreground">
						Page {Math.floor(offset / limit) + 1}
					</p>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => loadAppointments(Math.max(0, offset - limit))}
							disabled={!hasPrev || loading}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => loadAppointments(offset + limit)}
							disabled={!hasNext || loading}
						>
							Next
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
