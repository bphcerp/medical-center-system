import type { Doctor } from "src/api/doctor";

export type Speciality = {
	id: number;
	name: string;
	description: string | null;
};

export type Slot = { slotStart: string; slotEnd: string };

export type BookingState =
	| { step: 1 }
	| { step: 2; doctor: Doctor }
	| { step: 3; doctor: Doctor; date: Date; slot: Slot };

export const INITIAL_STATE: BookingState = { step: 1 };
