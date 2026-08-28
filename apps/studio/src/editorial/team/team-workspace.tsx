import { useOrganization, useUser } from "@clerk/tanstack-react-start";
import { UserPlus } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StudioPageHeader } from "@/editorial/shell/studio-page-header";

import { InviteMemberSheet } from "./invite-member-sheet";
import { TeamInvitationList } from "./team-invitation-list";
import { TeamMemberList } from "./team-member-list";
import type { TeamRole } from "./team-role";

const collectionOptions = {
  keepPreviousData: true,
  pageSize: 50,
} as const;

interface Feedback {
  kind: "error" | "success";
  message: string;
}

const readError = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Clerk could not complete that team update.";

export function TeamWorkspace() {
  const { user } = useUser();
  const { invitations, isLoaded, memberships, organization } = useOrganization({
    invitations: { ...collectionOptions, status: ["pending"] },
    memberships: collectionOptions,
  });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyKey, setBusyKey] = useState<string>();
  const [feedback, setFeedback] = useState<Feedback>();
  const openInvite = useCallback(() => setInviteOpen(true), []);

  const refreshTeam = useCallback(async () => {
    await Promise.all([
      memberships?.revalidate?.(),
      invitations?.revalidate?.(),
      organization?.reload(),
    ]);
  }, [invitations, memberships, organization]);

  const inviteMember = useCallback(
    async (emailAddress: string, role: TeamRole) => {
      if (!organization) {
        return false;
      }
      setBusyKey("invite");
      setFeedback(undefined);
      try {
        await organization.inviteMember({ emailAddress, role });
        await refreshTeam();
        setFeedback({
          kind: "success",
          message: `Invitation sent to ${emailAddress}.`,
        });
        return true;
      } catch (error) {
        setFeedback({ kind: "error", message: readError(error) });
        return false;
      } finally {
        setBusyKey(undefined);
      }
    },
    [organization, refreshTeam]
  );

  const updateMemberRole = useCallback(
    async (membershipId: string, role: TeamRole) => {
      const target = memberships?.data?.find(
        (membership) => membership.id === membershipId
      );
      if (!target) {
        return;
      }
      setBusyKey(membershipId);
      setFeedback(undefined);
      try {
        await target.update({ role });
        await memberships?.revalidate?.();
        setFeedback({ kind: "success", message: "Member role updated." });
      } catch (error) {
        setFeedback({ kind: "error", message: readError(error) });
      } finally {
        setBusyKey(undefined);
      }
    },
    [memberships]
  );

  const removeMember = useCallback(
    async (membershipId: string) => {
      const target = memberships?.data?.find(
        (membership) => membership.id === membershipId
      );
      if (!target) {
        return;
      }
      setBusyKey(membershipId);
      setFeedback(undefined);
      try {
        await target.destroy();
        await refreshTeam();
        setFeedback({ kind: "success", message: "Member removed." });
      } catch (error) {
        setFeedback({ kind: "error", message: readError(error) });
      } finally {
        setBusyKey(undefined);
      }
    },
    [memberships, refreshTeam]
  );

  const revokeInvitation = useCallback(
    async (invitationId: string) => {
      const target = invitations?.data?.find(
        (invitation) => invitation.id === invitationId
      );
      if (!target) {
        return;
      }
      setBusyKey(invitationId);
      setFeedback(undefined);
      try {
        await target.revoke();
        await refreshTeam();
        setFeedback({ kind: "success", message: "Invitation revoked." });
      } catch (error) {
        setFeedback({ kind: "error", message: readError(error) });
      } finally {
        setBusyKey(undefined);
      }
    },
    [invitations, refreshTeam]
  );

  const loading =
    !isLoaded ||
    memberships?.isLoading === true ||
    invitations?.isLoading === true;
  const members = memberships?.data ?? [];
  const pendingInvitations = invitations?.data ?? [];
  return (
    <>
      <div className="mx-auto min-h-[calc(100dvh-var(--studio-mobile-header-height))] w-full max-w-[1500px] pb-12 md:min-h-svh">
        <StudioPageHeader>
          <h1 className="m-0 font-[650] text-2xl tracking-[-0.03em]">Team</h1>
          <Button onClick={openInvite} size="lg" type="button">
            <UserPlus data-icon="inline-start" /> Invite member
          </Button>
        </StudioPageHeader>

        <div className="grid w-full gap-6 px-[42px] py-6 max-inventory-compact:px-6 max-inventory-mobile:px-4">
          {feedback ? (
            <div
              aria-live="polite"
              className={
                feedback.kind === "error"
                  ? "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm"
                  : "rounded-lg border border-success/30 bg-success-muted px-3 py-2 text-sm text-success"
              }
              role={feedback.kind === "error" ? "alert" : "status"}
            >
              {feedback.message}
            </div>
          ) : null}

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Members</CardTitle>
              <CardDescription>
                People who can sign in to the Editorial Studio.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div aria-busy="true" className="grid gap-3 p-4" role="status">
                  <span className="sr-only">Loading members</span>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <TeamMemberList
                  busyKey={busyKey}
                  currentUserId={user?.id}
                  members={members}
                  onRemove={removeMember}
                  onRoleChange={updateMemberRole}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Pending invitations</CardTitle>
              <CardDescription>
                Invitations waiting for the recipient to accept.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div aria-busy="true" className="p-4" role="status">
                  <span className="sr-only">Loading invitations</span>
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <TeamInvitationList
                  busyKey={busyKey}
                  invitations={pendingInvitations}
                  onRevoke={revokeInvitation}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <InviteMemberSheet
        busy={busyKey === "invite"}
        onInvite={inviteMember}
        onOpenChange={setInviteOpen}
        open={inviteOpen}
      />
    </>
  );
}
