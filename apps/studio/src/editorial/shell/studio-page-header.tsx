import type * as React from "react";

import { cn } from "@/lib/utils";

export function StudioPageHeader({
  className,
  ...props
}: React.ComponentProps<"header">) {
  return (
    <header
      className={cn(
        "flex h-[var(--studio-shell-header-height)] shrink-0 items-center justify-between gap-6 border-b px-[42px] max-inventory-mobile:h-auto max-inventory-mobile:min-h-[72px] max-inventory-compact:px-6 max-inventory-mobile:px-4 max-inventory-mobile:py-3",
        className
      )}
      {...props}
    />
  );
}
