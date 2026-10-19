"use client";

import { cn } from "@/lib/tiptap-utils";

export function Spacer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div aria-hidden="true" className={cn("flex-1", className)} {...props} />
  );
}
