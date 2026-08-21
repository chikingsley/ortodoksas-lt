import { UserButton, useUser } from "@clerk/tanstack-react-start";
import { BookOpenText, Building2, Home, Users } from "lucide-react";
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

export type StudioView = "communities" | "content" | "homepage" | "people";

const navItems = [
  { icon: BookOpenText, label: "Content", value: "content" },
  { icon: Home, label: "Homepage", value: "homepage" },
  { icon: Users, label: "People", value: "people" },
  { icon: Building2, label: "Communities", value: "communities" },
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
  const displayName = user?.fullName ?? user?.username ?? "Studio editor";
  const emailAddress = user?.primaryEmailAddress?.emailAddress;
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
