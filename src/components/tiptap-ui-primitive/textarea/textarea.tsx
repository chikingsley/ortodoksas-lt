"use client";

import { cn } from "@/lib/tiptap-utils";
import "./textarea.scss";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn("textarea", className)}
      data-slot="textarea"
      {...props}
    />
  );
}

export { Textarea };
