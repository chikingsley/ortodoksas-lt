import { UserButton, useUser } from "@clerk/tanstack-react-start";
import { hasText } from "@ortodoksas-lt/content/value";
import {
  Link,
  useMatchRoute,
  useRouteContext,
  useRouterState,
} from "@tanstack/react-router";
import {
  BookOpenText,
  Building2,
  Home,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useCallback } from "react";

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
  useSidebar,
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

const navItems = [
  {
    adminOnly: false,
    icon: BookOpenText,
    label: "Content",
    matchPaths: ["/articles", "/pages"],
    to: "/articles",
  },
  {
    adminOnly: false,
    icon: Home,
    label: "Homepage",
    matchPaths: ["/homepage"],
    to: "/homepage",
  },
  {
    adminOnly: false,
    icon: Users,
    label: "People",
    matchPaths: ["/people"],
    to: "/people",
  },
  {
    adminOnly: false,
    icon: Building2,
    label: "Communities",
    matchPaths: ["/communities"],
    to: "/communities",
  },
  {
    adminOnly: true,
    icon: ShieldCheck,
    label: "Team",
    matchPaths: ["/team"],
    to: "/team",
  },
] as const;

interface StudioBrandProps {
  className?: string;
  logoClassName?: string;
}

export function StudioBrand({ className, logoClassName }: StudioBrandProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <img
        alt="ortodoksas.lt"
        className={cn("block h-auto w-[112px] shrink-0", logoClassName)}
        height="193"
        src={publicationLogoUrl}
        width="1022"
      />
      <span className="text-brand-dark text-xs font-semibold tracking-widest uppercase">
        Studio
      </span>
    </div>
  );
}

export function StudioSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const { user } = useUser();
  const { studioRole } = useRouteContext({ from: "/_studio" });
  const matchRoute = useMatchRoute();

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const emailAddress = user?.primaryEmailAddress?.emailAddress;
  const emailName = emailAddress?.split("@")[0];

  const displayName =
    [user?.fullName, user?.username].find(hasText) ??
    (hasText(emailName) ? titleCaseIdentifier(emailName) : "Studio editor");

  const accountLabel = emailAddress ?? "Editor account";

  const closeMobileSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  return (
    <Sidebar
      aria-label="Studio navigation"
      collapsible="icon"
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Sidebar renders both desktop containers and a mobile Sheet; its navigation landmark must persist in either layout.
      role="navigation"
    >
      <SidebarHeader className="h-[var(--studio-shell-header-height)] justify-center">
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

                const isActive = item.matchPaths.some(
                  (to) => matchRoute({ fuzzy: true, to }) !== false
                );

                const target =
                  item.label === "Content" && pathname.startsWith("/pages")
                    ? "/pages"
                    : item.to;

                const preserveDirectorySearch =
                  isActive &&
                  (item.to === "/people" || item.to === "/communities");

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={
                        <Link
                          onClick={closeMobileSidebar}
                          search={preserveDirectorySearch ? true : undefined}
                          to={target}
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
      <SidebarFooter>
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
                <small className="text-muted-foreground mt-0.5 block truncate text-xs">
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
}
