import { useCallback, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { type TeamRole, teamRoleLabel, teamRoles } from "./team-role";
import type { TeamMemberResource } from "./team-types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const identifierNameSeparatorPattern = /[._+-]+/u;

interface ListProps {
  busyKey?: string;
  currentUserId?: string;
  members: TeamMemberResource[];
  onRemove: (membershipId: string) => Promise<void>;
  onRoleChange: (membershipId: string, role: TeamRole) => Promise<void>;
}

interface RowProps {
  busy: boolean;
  currentUserId?: string;
  member: TeamMemberResource;
  onRemove: (membershipId: string) => Promise<void>;
  onRoleChange: (membershipId: string, role: TeamRole) => Promise<void>;
}

const memberName = (member: TeamMemberResource) => {
  const name = [
    member.publicUserData?.firstName,
    member.publicUserData?.lastName,
  ]
    .filter(Boolean)
    .join(" ");
  return name || member.publicUserData?.identifier || "Studio member";
};

const memberInitials = (member: TeamMemberResource) => {
  const { publicUserData } = member;
  const nameParts = [
    publicUserData?.firstName,
    publicUserData?.lastName,
  ].filter(Boolean);
  const identifierParts = publicUserData?.identifier
    .split("@")[0]
    ?.split(identifierNameSeparatorPattern)
    .filter(Boolean);
  return (nameParts.length > 0 ? nameParts : (identifierParts ?? ["S"]))
    .slice(0, 2)
    .map((part) => part?.charAt(0))
    .join("")
    .toUpperCase();
};

function TeamMemberRow({
  busy,
  currentUserId,
  member,
  onRemove,
  onRoleChange,
}: RowProps) {
  const [confirming, setConfirming] = useState(false);
  const identifier =
    member.publicUserData?.identifier ?? "Account identifier unavailable";
  const name = memberName(member);
  const initials = memberInitials(member);
  const isCurrentUser = member.publicUserData?.userId === currentUserId;
  const role: TeamRole =
    member.role === "org:admin" ? "org:admin" : "org:member";

  const changeRole = useCallback(
    async (value: string | null) => {
      if (value === "org:admin" || value === "org:member") {
        await onRoleChange(member.id, value);
      }
    },
    [member.id, onRoleChange]
  );
  const requestRemoval = useCallback(() => setConfirming(true), []);
  const cancelRemoval = useCallback(() => setConfirming(false), []);
  const remove = useCallback(
    async () => onRemove(member.id),
    [member.id, onRemove]
  );

  return (
    <li className="grid items-center gap-4 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar size="lg">
          {member.publicUserData?.hasImage ? (
            <AvatarImage alt="" src={member.publicUserData.imageUrl} />
          ) : null}
          <AvatarFallback className="font-medium">{initials}</AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <strong className="block truncate font-medium text-sm">
            {name}{" "}
            {isCurrentUser ? (
              <span className="text-muted-foreground">(you)</span>
            ) : null}
          </strong>
          {name === identifier ? null : (
            <small className="block truncate text-muted-foreground text-xs">
              {identifier}
            </small>
          )}
          <small className="block text-muted-foreground text-xs sm:hidden">
            Joined {dateFormatter.format(member.createdAt)}
          </small>
        </span>
      </div>

      <Select
        disabled={busy || isCurrentUser}
        onValueChange={changeRole}
        value={role}
      >
        <SelectTrigger aria-label={`Role for ${identifier}`} className="w-full">
          <SelectValue>{teamRoleLabel[role]}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false}>
          {teamRoles.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex justify-end gap-2">
        {confirming ? (
          <>
            <Button
              disabled={busy}
              onClick={cancelRemoval}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={remove}
              size="sm"
              type="button"
              variant="destructive"
            >
              {busy ? "Removing…" : "Confirm removal"}
            </Button>
          </>
        ) : (
          <Button
            disabled={isCurrentUser}
            onClick={requestRemoval}
            size="sm"
            type="button"
            variant="ghost"
          >
            Remove
          </Button>
        )}
      </div>
    </li>
  );
}

export function TeamMemberList({
  busyKey,
  currentUserId,
  members,
  onRemove,
  onRoleChange,
}: ListProps) {
  if (members.length === 0) {
    return <p className="m-0 p-4 text-muted-foreground">The team is empty.</p>;
  }

  return (
    <ul aria-label="Studio members" className="m-0 list-none divide-y p-0">
      {members.map((member) => (
        <TeamMemberRow
          busy={busyKey === member.id}
          currentUserId={currentUserId}
          key={member.id}
          member={member}
          onRemove={onRemove}
          onRoleChange={onRoleChange}
        />
      ))}
    </ul>
  );
}
