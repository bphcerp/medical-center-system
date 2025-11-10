export const permissions = [
	"test",
	"vitals",
	"doctor",
	"admin",
	"lab",
] as const;

export type Permission = (typeof permissions)[number];

export const permissionDescriptions: Record<Permission, string> = {
	test: "Access to test features",
	vitals: "View and record patient vitals",
	admin: "Create, edit, and delete user accounts, roles and permissions",
	doctor: "Access to doctor-specific features",
	lab: "Access to lab report entry and management",
};
