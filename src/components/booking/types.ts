export type Category = { id: number; name: string; description: string | null };

export type Doctor = {
	doctorId: number;
	doctorName: string;
	doctorType: "campus" | "visiting";
};

export type Slot = { slotStart: string; slotEnd: string };

export type BookingState = {
	step: number;
	categoryId: number | null;
	categoryName: string;
	doctor: Doctor | null;
	date: Date | null;
	slot: Slot | null;
	patientId: number | null;
};

export const INITIAL_STATE: BookingState = {
	step: 1,
	categoryId: null,
	categoryName: "",
	doctor: null,
	date: null,
	slot: null,
	patientId: null,
};

export function formatTime12(t: string): string {
	const [hStr, mStr] = t.split(":");
	const h = Number(hStr);
	const m = Number(mStr);
	const period = h >= 12 ? "PM" : "AM";
	const h12 = h % 12 || 12;
	return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatDateStr(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
