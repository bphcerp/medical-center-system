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
import { dayOfWeekEnum } from "./utils";

export const doctorScheduleOverrideTypeEnum = pgEnum(
	"doctor_schedule_override_type",
	[
		"unavailable", // doctor is off that day
		"custom_hours", // different start/end/slot duration for that day
	],
);
export const doctorAvailabilityTypes = ["campus", "visiting"] as const;

export type DoctorAvailabilityType =
	(typeof doctorAvailabilityTypeEnum.enumValues)[number];

export const doctorAvailabilityTypeEnum = pgEnum(
	"doctor_availability_type",
	doctorAvailabilityTypes,
);

export const doctorSpecialitiesTable = pgTable("doctor_specialities", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	name: varchar({ length: 255 }).notNull().unique(),
	description: text(),
	/** For soft-delete purposes */
	isActive: boolean().notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});

export const doctorsTable = pgTable("doctors", {
	id: integer("id")
		.primaryKey()
		.references(() => usersTable.id),

	specialityId: integer("speciality_id")
		.notNull()
		.references(() => doctorSpecialitiesTable.id),

	availabilityType: doctorAvailabilityTypeEnum("availability_type").notNull(),
});

export const doctorScheduleTable = pgTable(
	"doctor_schedule",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		doctorId: integer()
			.notNull()
			.references(() => doctorsTable.id),
		dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
		startTime: time("start_time").notNull(),
		endTime: time("end_time").notNull(),
		/** Duration of each bookable slot in minutes (e.g. 15) */
		slotDurationMinutes: integer("slot_duration_minutes").notNull().default(15),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		uniqueIndex("dwt_doctor_day_start_idx").on(
			table.doctorId,
			table.dayOfWeek,
			table.startTime,
		),
	],
);

export const doctorScheduleOverridesTable = pgTable(
	"doctor_schedule_overrides",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		doctorId: integer()
			.notNull()
			.references(() => doctorsTable.id),
		overrideDate: date("override_date").notNull(),
		overrideType: doctorScheduleOverrideTypeEnum("override_type").notNull(),
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
