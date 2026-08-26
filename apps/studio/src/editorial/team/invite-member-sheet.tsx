import { useCallback, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { type TeamRole, teamRoleLabel, teamRoles } from "./team-role";

interface Props {
  busy: boolean;
  onInvite: (emailAddress: string, role: TeamRole) => Promise<boolean>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function InviteMemberSheet({
  busy,
  onInvite,
  onOpenChange,
  open,
}: Props) {
  const emailId = useId();
  const roleId = useId();
  const [emailAddress, setEmailAddress] = useState("");
  const [role, setRole] = useState<TeamRole>("org:member");

  const changeRole = useCallback((value: string | null) => {
    if (value === "org:admin" || value === "org:member") {
      setRole(value);
    }
  }, []);

  const changeEmail = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setEmailAddress(event.target.value),
    []
  );

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const sent = await onInvite(emailAddress.trim(), role);
      if (sent) {
        setEmailAddress("");
        setRole("org:member");
        onOpenChange(false);
      }
    },
    [emailAddress, onInvite, onOpenChange, role]
  );

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-[calc(100%-1rem)]" side="right">
        <SheetHeader>
          <SheetTitle>Invite a team member</SheetTitle>
          <SheetDescription>
            Clerk emails the recipient a secure invitation to the Editorial
            Studio.
          </SheetDescription>
        </SheetHeader>
        <form
          className="grid gap-5 px-4"
          id="team-invite-form"
          onSubmit={submit}
        >
          <div className="grid gap-2">
            <Label htmlFor={emailId}>Email address</Label>
            <Input
              autoComplete="email"
              id={emailId}
              onChange={changeEmail}
              placeholder="name@example.com"
              required
              type="email"
              value={emailAddress}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={roleId}>Role</Label>
            <Select onValueChange={changeRole} value={role}>
              <SelectTrigger className="w-full" id={roleId}>
                <SelectValue>{teamRoleLabel[role]}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {teamRoles.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="m-0 text-muted-foreground text-xs">
              Admins manage membership and access. Members edit publication
              content.
            </p>
          </div>
        </form>
        <SheetFooter>
          <Button
            disabled={busy || emailAddress.trim().length === 0}
            form="team-invite-form"
            type="submit"
          >
            {busy ? "Sending…" : "Send invitation"}
          </Button>
          <Button
            disabled={busy}
            onClick={close}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
