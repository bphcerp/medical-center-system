import { z } from "zod";

const studentScannedPattern = /^([FDPH])(20\d{2})(\d{4})H$/i;
const studentCanonicalPattern = /^([FDPH])(20\d{2})(\d{4})$/i;
const professorPattern = /^\**((PSRN|H)(\d{4}))\**$/i;
const phonePattern = /^\d+$/;

export const IdentifierTypeSchema = z.enum(["psrn", "student_id", "phone"]);
export type IdentifierType = z.infer<typeof IdentifierTypeSchema>;

const StudentIdentifierSchema = z.object({
	type: z.literal("student_id"),
	identifier: z.string().regex(/^[FDPH]20\d{6}$/),
	split: z.tuple([
		z.enum(["F", "D", "P", "H"]),
		z.string().regex(/^20\d{2}$/),
		z.string().regex(/^\d{4}$/),
	]),
});

const PsrnIdentifierSchema = z.object({
	type: z.literal("psrn"),
	identifier: z.string().regex(/^PSRN\d{4}$/),
});

const PhoneIdentifierSchema = z.object({
	type: z.literal("phone"),
	identifier: z.string().regex(/^\d+$/),
});

export const IdentifierResultSchema = z.discriminatedUnion("type", [
	StudentIdentifierSchema,
	PsrnIdentifierSchema,
	PhoneIdentifierSchema,
]);

export type IdentifierResult = z.infer<typeof IdentifierResultSchema>;

const buildStudentIdentifier = (
	match: RegExpExecArray,
): Extract<IdentifierResult, { type: "student_id" }> => {
	const prefix = match[1].toUpperCase() as "F" | "D" | "P" | "H";
	const year = match[2];
	const roll = match[3];

	return {
		type: "student_id",
		identifier: `${prefix}${year}${roll}`,
		split: [prefix, year, roll],
	};
};

const parseStudentIdentifier = (input: string) => {
	const match =
		studentScannedPattern.exec(input) ?? studentCanonicalPattern.exec(input);
	if (!match) {
		return null;
	}

	return buildStudentIdentifier(match);
};

const parseProfessorIdentifier = (input: string) => {
	const match = professorPattern.exec(input);
	if (!match) {
		return null;
	}

	return {
		type: "psrn" as const,
		identifier: `PSRN${match[3]}`,
	};
};

const parsePhoneIdentifier = (input: string) => {
	if (!phonePattern.test(input)) {
		return null;
	}

	return {
		type: "phone" as const,
		identifier: input,
	};
};

export function normalizeIdentifier(
	input: string,
	expectedType?: IdentifierType,
): IdentifierResult | null {
	const value = input.trim();
	if (value.length === 0) {
		return null;
	}

	const parsed =
		expectedType === "student_id"
			? parseStudentIdentifier(value)
			: expectedType === "psrn"
				? parseProfessorIdentifier(value)
				: expectedType === "phone"
					? parsePhoneIdentifier(value)
					: (parseProfessorIdentifier(value) ??
						parseStudentIdentifier(value) ??
						parsePhoneIdentifier(value));

	if (!parsed) {
		return null;
	}

	const result = IdentifierResultSchema.safeParse(parsed);
	if (!result.success) {
		return null;
	}

	return result.data;
}

export function validateIdentifier(
	identifier: string,
): IdentifierResult | null {
	return normalizeIdentifier(identifier);
}

export const IdentifierLookupQuerySchema = z
	.object({
		type: IdentifierTypeSchema,
		identifier: z.string().trim().min(1),
	})
	.transform((value, ctx) => {
		const normalized = normalizeIdentifier(value.identifier, value.type);
		if (!normalized) {
			ctx.addIssue({
				code: "custom",
				message: "Invalid identifier format",
				path: ["identifier"],
			});
			return z.NEVER;
		}

		return {
			type: normalized.type,
			identifier: normalized.identifier,
		};
	});
