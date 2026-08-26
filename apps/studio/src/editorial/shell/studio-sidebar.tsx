import { UserButton, useUser } from "@clerk/tanstack-react-start";
import { useRouteContext } from "@tanstack/react-router";
import {
  BookOpenText,
  Building2,
  Home,
  ShieldCheck,
  Users,
} from "lucide-react";
import { type MouseEvent, useCallback } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const publicationLogoUrl = "/assets/brand/ortodoksas-logo-official.svg";
const emailNameSeparatorPattern = /[._+-]+/u;

const titleCaseIdentifier = (value: string) =>
  value
    .split(emailNameSeparatorPattern)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

export type StudioView =
  | "communities"
  | "content"
  | "homepage"
  | "people"
  | "team";

const navItems = [
  { adminOnly: false, icon: BookOpenText, label: "Content", value: "content" },
  { adminOnly: false, icon: Home, label: "Homepage", value: "homepage" },
  { adminOnly: false, icon: Users, label: "People", value: "people" },
  {
    adminOnly: false,
    icon: Building2,
    label: "Communities",
    value: "communities",
  },
  { adminOnly: true, icon: ShieldCheck, label: "Team", value: "team" },
] as const;

interface Props {
  activeView: StudioView;
  onNavigate: (view: StudioView) => void;
}

interface StudioBrandProps {
  className?: string;
  logoClassName?: string;
}

export const StudioBrand = ({ className, logoClassName }: StudioBrandProps) => (
  <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
    <img
      alt="ortodoksas.lt"
      className={cn("block h-auto w-[112px] shrink-0", logoClassName)}
      height="193"
      src={publicationLogoUrl}
      width="1022"
    />
    <span className="font-semibold text-[10px] text-brand-dark uppercase tracking-[0.14em]">
      Studio
    </span>
  </div>
);

export const StudioSidebar = ({ activeView, onNavigate }: Props) => {
  const { user } = useUser();
  const { studioRole } = useRouteContext({ from: "/_studio" });
  const emailAddress = user?.primaryEmailAddress?.emailAddress;
  const emailName = emailAddress?.split("@")[0];
  const displayName =
    user?.fullName ||
    user?.username ||
    (emailName ? titleCaseIdentifier(emailName) : "Studio editor");
  const accountLabel = emailAddress ?? "Editor account";
  const navigate = useCallback(
    (event: MouseEvent<HTMLButtonElement>) =>
      onNavigate(event.currentTarget.value as StudioView),
    [onNavigate]
  );

  return (
    <Sidebar
      aria-label="Studio navigation"
      collapsible="icon"
      role="navigation"
    >
      <SidebarHeader className="h-[var(--studio-shell-header-height)] justify-center border-sidebar-border border-b px-3">
        <StudioBrand className="group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Publication</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (item.adminOnly && studioRole !== "admin") {
                  return null;
                }
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      isActive={item.value === activeView}
                      render={
                        <button
                          onClick={navigate}
                          type="button"
                          value={item.value}
                        />
                      }
                      tooltip={item.label}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex h-12 w-full items-center gap-2 overflow-hidden rounded-md p-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0">
              <div className="grid size-8 shrink-0 place-items-center">
                <UserButton />
              </div>
              <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                <strong className="block truncate text-xs">
                  {displayName}
                </strong>
                <small className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                  {accountLabel}
                </small>
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
