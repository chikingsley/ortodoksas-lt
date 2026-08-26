export type TeamRole = "org:admin" | "org:member";

export const teamRoleLabel: Record<TeamRole, string> = {
  "org:admin": "Admin",
  "org:member": "Member",
};

export const teamRoles = Object.entries(teamRoleLabel).map(
  ([value, label]) => ({
    label,
    value: value as TeamRole,
  })
);
