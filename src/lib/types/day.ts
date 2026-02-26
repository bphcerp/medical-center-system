export const daysOfWeek = [
	"sunday",
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
] as const;

export type Day = (typeof daysOfWeek)[number];
