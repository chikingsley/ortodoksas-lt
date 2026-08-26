import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";

import { teamRoleLabel } from "./team-role";
import type { TeamInvitationResource } from "./team-types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

interface ListProps {
  busyKey?: string;
  invitations: TeamInvitationResource[];
  onRevoke: (invitationId: string) => Promise<void>;
}

interface RowProps {
  busy: boolean;
  invitation: TeamInvitationResource;
  onRevoke: (invitationId: string) => Promise<void>;
}

function TeamInvitationRow({ busy, invitation, onRevoke }: RowProps) {
  const [confirming, setConfirming] = useState(false);
  const role = invitation.role === "org:admin" ? "org:admin" : "org:member";
  const requestRevoke = useCallback(() => setConfirming(true), []);
  const cancelRevoke = useCallback(() => setConfirming(false), []);
  const revoke = useCallback(
    async () => onRevoke(invitation.id),
    [invitation.id, onRevoke]
  );

  return (
    <li className="grid items-center gap-4 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
      <span className="min-w-0">
        <strong className="block truncate font-medium text-sm">
          {invitation.emailAddress}
        </strong>
        <small className="block text-muted-foreground text-xs">
          Invited {dateFormatter.format(invitation.createdAt)}
        </small>
      </span>
      <span className="text-muted-foreground text-sm">
        {teamRoleLabel[role]}
      </span>
      <div className="flex justify-end gap-2">
        {confirming ? (
          <>
            <Button
              disabled={busy}
              onClick={cancelRevoke}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={revoke}
              size="sm"
              type="button"
              variant="destructive"
            >
              {busy ? "Revoking…" : "Confirm revoke"}
            </Button>
          </>
        ) : (
          <Button
            onClick={requestRevoke}
            size="sm"
            type="button"
            variant="ghost"
          >
            Revoke
          </Button>
        )}
      </div>
    </li>
  );
}

export function TeamInvitationList({
  busyKey,
  invitations,
  onRevoke,
}: ListProps) {
  if (invitations.length === 0) {
    return (
      <p className="m-0 p-4 text-muted-foreground">
        Every invitation has been accepted or cleared.
      </p>
    );
  }

  return (
    <ul aria-label="Pending invitations" className="m-0 list-none divide-y p-0">
      {invitations.map((invitation) => (
        <TeamInvitationRow
          busy={busyKey === invitation.id}
          invitation={invitation}
          key={invitation.id}
          onRevoke={onRevoke}
        />
      ))}
    </ul>
  );
}
