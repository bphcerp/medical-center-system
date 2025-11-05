export const Permissions = ["test" , "vitals", "manage-users", "doctor"] as const;
export type Permission = (typeof Permissions)[number];

