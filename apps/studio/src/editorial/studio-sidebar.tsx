import { UserButton, useUser } from "@clerk/react";
import {
  BookOpenText,
  FileText,
  Globe2,
  Home,
  Image,
  Languages,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navGroups = [
  {
    items: [
      { active: true, icon: BookOpenText, label: "Articles" },
      { icon: FileText, label: "Pages" },
      { icon: Image, label: "Media" },
    ],
    label: "Content",
  },
  {
    items: [
      { icon: Home, label: "Homepage" },
      { icon: Languages, label: "Translations" },
      { icon: Globe2, label: "Publishing" },
    ],
    label: "Publication",
  },
] as const;

export const StudioSidebar = () => {
  const { user } = useUser();
  const displayName =
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress ??
    "Studio editor";
  const emailAddress = user?.primaryEmailAddress?.emailAddress;

  return (
    <aside className="sticky top-0 z-20 flex h-screen flex-col border-border border-r bg-card max-inventory-mobile:static max-inventory-mobile:block max-inventory-mobile:h-16 max-inventory-mobile:w-full max-inventory-mobile:border-r-0 max-inventory-mobile:border-b">
      <div className="flex h-[76px] items-center justify-between gap-2.5 border-border border-b py-0 pr-3.5 pl-[18px] max-inventory-mobile:h-[63px]">
        <div>
          <strong className="block text-sm tracking-[-0.01em]">
            Ortodoksas.lt
          </strong>
          <span className="mt-px block text-[11px] text-muted-foreground">
            Studio
          </span>
        </div>
        <span className="hidden max-inventory-mobile:block">
          <UserButton />
        </span>
      </div>

      <nav
        aria-label="Editorial navigation"
        className="flex-1 overflow-y-auto px-2.5 py-[18px] max-inventory-mobile:hidden"
      >
        {navGroups.map((group) => (
          <div className="not-first:mt-[23px]" key={group.label}>
            <p className="mx-2.5 mt-0 mb-2 font-semibold text-[10px] text-muted-foreground uppercase tracking-widest">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={cn(
                    "flex h-9 w-full items-center gap-2.5 rounded-md border-0 bg-transparent px-2.5 py-0 text-left text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-4 [&_svg]:stroke-[1.8]",
                    "active" in item &&
                      item.active &&
                      "bg-accent font-semibold text-primary"
                  )}
                  key={item.label}
                  type="button"
                >
                  <Icon />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="m-2.5 grid grid-cols-[32px_minmax(0,1fr)] items-center gap-[9px] border-0 border-border border-t bg-card px-2 py-2.5 text-left max-inventory-mobile:hidden">
        <UserButton />
        <span className="min-w-0">
          <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs">
            {displayName}
          </strong>
          <small className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted-foreground">
            {emailAddress ?? "Editor access"}
          </small>
        </span>
      </div>
    </aside>
  );
};
