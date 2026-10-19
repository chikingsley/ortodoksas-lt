/* oxlint-disable jsx-a11y/prefer-tag-over-role -- WAI-ARIA group expresses related toolbar or input controls; fieldset would introduce form grouping and legend semantics. This preserves the upstream component contract. */
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/tiptap-utils";

import "./button-group.scss";

const buttonGroupVariants = cva("tiptap-button-group", {
  defaultVariants: {
    orientation: "horizontal",
  },
  variants: {
    orientation: {
      horizontal: "tiptap-button-group-horizontal",
      vertical: "tiptap-button-group-vertical",
    },
  },
});

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="tiptap-button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  );
}

export { ButtonGroup, buttonGroupVariants };
