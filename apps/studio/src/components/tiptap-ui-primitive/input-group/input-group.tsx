import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { Button } from "@/components/tiptap-ui-primitive/button";

import { Input } from "@/components/tiptap-ui-primitive/input";
import { Textarea } from "@/components/tiptap-ui-primitive/textarea";
import { cn } from "@/lib/tiptap-utils";

import "./input-group.scss";

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("tiptap-input-group", className)}
      data-slot="tiptap-input-group"
      role="group"
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
      className={cn(inputGroupAddonVariants({ align }), className)}
      data-align={align}
      data-slot="tiptap-input-group-addon"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return;
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      role="group"
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva("tiptap-input-group-button", {
  defaultVariants: {
    size: "xs",
  },
  variants: {
    size: {
      "icon-sm": "tiptap-input-group-button--icon-sm",
      "icon-xs": "tiptap-input-group-button--icon-xs",
      sm: "tiptap-input-group-button--sm",
      xs: "tiptap-input-group-button--xs",
    },
  },
});

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: "button" | "submit" | "reset";
  }) {
  return (
    <Button
      className={cn(inputGroupButtonVariants({ size }), className)}
      data-size={size}
      type={type}
      variant={variant}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={cn("tiptap-input-group-text", className)} {...props} />
  );
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      className={cn("tiptap-input-group-control", className)}
      data-slot="tiptap-input-group-control"
      {...props}
    />
  );
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      className={cn(
        "tiptap-input-group-control tiptap-input-group-control--textarea",
        className
      )}
      data-slot="tiptap-input-group-control"
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
};
