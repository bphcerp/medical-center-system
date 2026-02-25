import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
	boolean,
	date,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	time,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { patientsTable } from "./patient";

export const dayOfWeekEnum = pgEnum("day_of_week", [
	"sunday",
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
]);

export const doctorTypeEnum = pgEnum("doctor_type", ["campus", "visiting"]);

export const scheduleOverrideTypeEnum = pgEnum("schedule_override_type", [
	"unavailable", // doctor is off that day
	"custom_hours", // different start/end/slot duration for that day
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
	"scheduled",
	"cancelled",
	"completed",
	"no_show",
]);

export const specialistCategoriesTable = pgTable("specialist_categories", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	name: varchar({ length: 255 }).notNull().unique(),
	description: text(),
	isActive: boolean().notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});

export const doctorCategoryAssignmentsTable = pgTable(
	"doctor_category_assignments",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		doctorId: integer()
			.notNull()
			.references(() => usersTable.id),
		categoryId: integer()
			.notNull()
			.references(() => specialistCategoriesTable.id),
		doctorType: doctorTypeEnum("doctor_type").notNull().default("campus"),
		isActive: boolean().notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("doctor_category_unique_idx").on(
			table.doctorId,
			table.categoryId,
		),
		index("dca_doctor_idx").on(table.doctorId),
		index("dca_category_idx").on(table.categoryId),
	],
);

export const doctorWeeklyTemplatesTable = pgTable(
	"doctor_weekly_templates",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		doctorId: integer()
			.notNull()
			.references(() => usersTable.id),
		dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
		startTime: time("start_time").notNull(),
		endTime: time("end_time").notNull(),
		/** Duration of each bookable slot in minutes (e.g. 15) */
		slotDurationMinutes: integer("slot_duration_minutes").notNull().default(15),
		isActive: boolean().notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("dwt_doctor_idx").on(table.doctorId),
		index("dwt_doctor_day_idx").on(table.doctorId, table.dayOfWeek),
	],
);

export const doctorScheduleOverridesTable = pgTable(
	"doctor_schedule_overrides",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		doctorId: integer()
			.notNull()
			.references(() => usersTable.id),
		overrideDate: date("override_date").notNull(),
		overrideType: scheduleOverrideTypeEnum("override_type").notNull(),
		/** Required when overrideType = 'custom_hours' */
		startTime: time("start_time"),
		/** Required when overrideType = 'custom_hours' */
		endTime: time("end_time"),
		/** Required when overrideType = 'custom_hours' */
		slotDurationMinutes: integer("slot_duration_minutes"),
		reason: text(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("dso_doctor_date_idx").on(table.doctorId, table.overrideDate),
		index("dso_date_idx").on(table.overrideDate),
	],
);

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
		categoryId: integer()
			.notNull()
			.references(() => specialistCategoriesTable.id),

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
		index("appointment_category_idx").on(table.categoryId),
		index("appointment_date_idx").on(table.appointmentDate),
	],
);
