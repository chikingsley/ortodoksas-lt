export type TeamRole = "org:admin" | "org:member";

export const teamRoleLabel: Record<TeamRole, string> = {
  "org:admin": "Admin",
  "org:member": "Member",
};

export const teamRoles = (["org:admin", "org:member"] as const).map(
  (value) => ({ label: teamRoleLabel[value], value })
);
