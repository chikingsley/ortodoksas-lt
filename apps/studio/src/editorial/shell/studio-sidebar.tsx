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
      className={cn("block h-auto w-[132px] shrink-0", logoClassName)}
      height="193"
      src={publicationLogoUrl}
      width="1022"
    />
    <span className="border-brand-dark/25 border-l pl-2 font-semibold text-[10px] text-brand-dark uppercase tracking-[0.14em]">
      Studio
    </span>
  </div>
);

export const StudioSidebar = ({ activeView, onNavigate }: Props) => {
  const { user } = useUser();
  const displayName =
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress ??
    "Studio editor";
  const emailAddress = user?.primaryEmailAddress?.emailAddress;
  const accessLabel =
    user?.publicMetadata.role === "admin" ? "Administrator" : "Editor access";
  const accountLabel = emailAddress
    ? `${accessLabel} · ${emailAddress}`
    : accessLabel;
  const navigate = useCallback(
    (event: MouseEvent<HTMLButtonElement>) =>
      onNavigate(event.currentTarget.value as StudioView),
    [onNavigate]
  );

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="h-[var(--studio-shell-header-height)] justify-center border-b px-[18px]">
        <StudioBrand />
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
      <SidebarFooter className="border-t">
        <div className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2.5 px-2 py-1.5">
          <UserButton />
          <span className="min-w-0">
            <strong className="block truncate text-xs">{displayName}</strong>
            <small className="mt-0.5 block truncate text-[10px] text-muted-foreground">
              {accountLabel}
            </small>
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
