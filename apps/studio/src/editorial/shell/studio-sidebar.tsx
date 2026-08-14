import { UserButton, useUser } from "@clerk/tanstack-react-start";
import { BookOpenText, Building2, Home, Users } from "lucide-react";
import { type MouseEvent, useCallback } from "react";

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
    <aside className="sticky top-0 z-20 flex h-screen flex-col border-border border-r bg-card max-inventory-mobile:static max-inventory-mobile:block max-inventory-mobile:h-[var(--studio-mobile-header-height)] max-inventory-mobile:w-full max-inventory-mobile:border-r-0 max-inventory-mobile:border-b">
      <div className="flex h-[var(--studio-shell-header-height)] items-center justify-between gap-2.5 border-border border-b py-0 pr-3.5 pl-[18px] max-inventory-mobile:h-[var(--studio-mobile-header-height)]">
        <StudioBrand logoClassName="max-[1101px]:w-[108px] max-inventory-mobile:w-[124px]" />
        <div className="hidden items-center gap-1 max-inventory-mobile:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.value === activeView;
            return (
              <button
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  "grid size-[var(--studio-action-height)] place-items-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-accent text-accent-foreground"
                )}
                key={item.value}
                onClick={navigate}
                type="button"
                value={item.value}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
        <span className="hidden max-inventory-mobile:block">
          <UserButton />
        </span>
      </div>

      <nav
        aria-label="Editorial navigation"
        className="flex-1 overflow-y-auto px-2.5 py-[18px] max-inventory-mobile:hidden"
      >
        <p className="mx-2.5 mt-0 mb-2 font-semibold text-[10px] text-muted-foreground uppercase tracking-widest">
          Publication
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.value === activeView;
          return (
            <button
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-[var(--studio-action-height)] w-full items-center gap-2.5 rounded-md border-0 bg-transparent px-2.5 py-0 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4 [&_svg]:stroke-[1.8]",
                active && "bg-accent font-semibold text-accent-foreground"
              )}
              key={item.value}
              onClick={navigate}
              type="button"
              value={item.value}
            >
              <Icon />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="m-2.5 grid grid-cols-[32px_minmax(0,1fr)] items-center gap-[9px] border-0 border-border border-t bg-card px-2 py-2.5 text-left max-inventory-mobile:hidden">
        <UserButton />
        <span className="min-w-0">
          <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs">
            {displayName}
          </strong>
          <small className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted-foreground">
            {accountLabel}
          </small>
        </span>
      </div>
    </aside>
  );
};
