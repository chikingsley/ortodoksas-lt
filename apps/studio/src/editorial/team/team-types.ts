import type {
  OrganizationInvitationResource,
  OrganizationMembershipResource,
} from "@clerk/tanstack-react-start/types";

export type TeamMemberResource = Pick<
  OrganizationMembershipResource,
  "createdAt" | "destroy" | "id" | "publicUserData" | "role" | "update"
>;

export type TeamInvitationResource = Pick<
  OrganizationInvitationResource,
  "createdAt" | "emailAddress" | "id" | "revoke" | "role"
>;
