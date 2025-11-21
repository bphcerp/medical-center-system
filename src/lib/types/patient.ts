export const patientTypes = [
	"student",
	"professor",
	"dependent",
	"visitor",
] as const;

export type PatientType = (typeof patientTypes)[number];

export type Patient = {
	name: string;
	type: PatientType;
	age: number;
	sex: "male" | "female";
};
