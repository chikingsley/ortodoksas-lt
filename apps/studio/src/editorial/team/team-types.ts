import type { TeamRole } from "./team-role";

interface TeamPublicUserData {
  firstName: string | null;
  hasImage: boolean;
  identifier: string;
  imageUrl: string;
  lastName: string | null;
  userId?: string;
}

export interface TeamMemberResource {
  createdAt: Date;
  destroy: () => Promise<unknown>;
  id: string;
  publicUserData?: TeamPublicUserData;
  role: string;
  update: (params: { role: TeamRole }) => Promise<unknown>;
}

export interface TeamInvitationResource {
  createdAt: Date;
  emailAddress: string;
  id: string;
  revoke: () => Promise<unknown>;
  role: string;
}
