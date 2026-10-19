"use client";

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- WAI-ARIA group expresses related toolbar or input controls; fieldset would introduce form grouping and legend semantics. This preserves the upstream component contract. */

import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import * as React from "react";

import { Input } from "@/components/tiptap-ui-primitive/input/input";
import { cn } from "@/lib/tiptap-utils";

import "./input-group.scss";

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tiptap-input-group"
      role="group"
      className={cn("tiptap-input-group", className)}
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva("tiptap-input-group-addon", {
  defaultVariants: {
    align: "inline-start",
  },
  variants: {
    align: {
      "block-end": "tiptap-input-group-addon--block-end",
      "block-start": "tiptap-input-group-addon--block-start",
      "inline-end": "tiptap-input-group-addon--inline-end",
      "inline-start": "tiptap-input-group-addon--inline-start",
    },
  },
});

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      data-slot="tiptap-input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      {...props}
    />
  );
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="tiptap-input-group-control"
      className={cn("tiptap-input-group-control", className)}
      {...props}
    />
  );
}

export { InputGroup, InputGroupAddon, InputGroupInput };
