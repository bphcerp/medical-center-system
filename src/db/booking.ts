import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
	date,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	time,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { patientsTable } from "./patient";

export const appointmentStatusEnum = pgEnum("appointment_status", [
	"scheduled",
	"cancelled",
	"completed",
	"no_show",
]);

export const appointmentsTable = pgTable(
	"appointments",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		patientId: integer()
			.notNull()
			.references(() => patientsTable.id),
		doctorId: integer()
			.notNull()
			.references(() => usersTable.id),

		appointmentDate: date("appointment_date").notNull(),
		/** Inclusive start of the booked slot (e.g. "10:00") */
		slotStart: time("slot_start").notNull(),
		/** Exclusive end of the booked slot (e.g. "10:15") */
		slotEnd: time("slot_end").notNull(),

		status: appointmentStatusEnum("status").notNull().default("scheduled"),

		/**
		 * Optional sequential token number within the same doctor+date,
		 * generated at booking time (1, 2, 3 …).
		 */
		tokenNumber: integer("token_number"),

		/** Receptionist who created this booking */
		bookedById: integer("booked_by_id")
			.notNull()
			.references(() => usersTable.id),

		/** Points to the appointment this one replaces (reschedule chain) */
		rescheduledFromId: integer("rescheduled_from_id").references(
			(): AnyPgColumn => appointmentsTable.id,
		),

		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		cancellationReason: text("cancellation_reason"),

		/** Optional notes added at booking time */
		notes: text(),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		/**
		 * Prevents double-booking: one patient per doctor-date-slot.
		 */
		uniqueIndex("appointment_slot_unique_idx").on(
			table.doctorId,
			table.appointmentDate,
			table.slotStart,
		),
		/** Unique token per doctor per day */
		uniqueIndex("appointment_token_unique_idx").on(
			table.doctorId,
			table.appointmentDate,
			table.tokenNumber,
		),
		index("appointment_patient_idx").on(table.patientId),
		index("appointment_doctor_date_idx").on(
			table.doctorId,
			table.appointmentDate,
		),
		index("appointment_status_idx").on(table.status),
		index("appointment_date_idx").on(table.appointmentDate),
	],
);
