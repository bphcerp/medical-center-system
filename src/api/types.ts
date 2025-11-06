export const permissions = ["test" , "vitals", "manage-users", "doctor"] as const;

export type Permission = (typeof permissions)[number];

export const permissionDescriptions: Record<Permission, string> = {
  test: "Access to test features",
  vitals: "View and record patient vitals",
  "manage-users": "Create, edit, and delete user accounts",
  doctor: "Access to doctor-specific features",
};