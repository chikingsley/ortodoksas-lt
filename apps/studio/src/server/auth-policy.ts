export type StudioRole = "admin" | "editor";

export interface StudioEditor {
  id: string;
  organizationId: string;
  role: StudioRole;
}

interface OrganizationAuthentication {
  isAuthenticated: boolean;
  orgId: string | null | undefined;
  orgRole: string | null | undefined;
  userId: string | null;
}

export const getAuthorizedEditor = (
  authentication: OrganizationAuthentication,
  organizationId: string | undefined
): StudioEditor | null => {
  if (
    !(authentication.isAuthenticated && authentication.userId && organizationId)
  ) {
    return null;
  }
  if (authentication.orgId !== organizationId) {
    return null;
  }

  let role: StudioRole | null = null;
  if (authentication.orgRole === "org:admin") {
    role = "admin";
  } else if (authentication.orgRole === "org:member") {
    role = "editor";
  }

  return role
    ? {
        id: authentication.userId,
        organizationId: authentication.orgId,
        role,
      }
    : null;
};
