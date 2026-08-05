"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/tiptap-utils";
import "@/components/tiptap-ui-primitive/card/card.scss";

const Card = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div className={cn("tiptap-card", className)} ref={ref} {...props} />
  )
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div className={cn("tiptap-card-header", className)} ref={ref} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardBody = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div className={cn("tiptap-card-body", className)} ref={ref} {...props} />
  )
);
CardBody.displayName = "CardBody";

const CardItemGroup = forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    orientation?: "horizontal" | "vertical";
  }
>(({ className, orientation = "vertical", ...props }, ref) => (
  <div
    className={cn("tiptap-card-item-group", className)}
    data-orientation={orientation}
    ref={ref}
    {...props}
  />
));
CardItemGroup.displayName = "CardItemGroup";

const CardGroupLabel = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div
      className={cn("tiptap-card-group-label", className)}
      ref={ref}
      {...props}
    />
  )
);
CardGroupLabel.displayName = "CardGroupLabel";

const CardFooter = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div className={cn("tiptap-card-footer", className)} ref={ref} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardBody,
  CardFooter,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
};
