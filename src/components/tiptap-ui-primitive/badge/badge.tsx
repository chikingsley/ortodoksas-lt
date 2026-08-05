import { forwardRef } from "react";
import "@/components/tiptap-ui-primitive/badge/badge-colors.scss";
import "@/components/tiptap-ui-primitive/badge/badge-group.scss";
import "@/components/tiptap-ui-primitive/badge/badge.scss";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  appearance?: "default" | "subdued" | "emphasized";
  size?: "default" | "small";
  trimText?: boolean;
  variant?: "ghost" | "white" | "gray" | "green" | "yellow" | "default";
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      variant,
      size = "default",
      appearance = "default",
      trimText = false,
      className,
      children,
      ...props
    },
    ref
  ) => (
    <div
      className={`tiptap-badge ${className || ""}`}
      data-appearance={appearance}
      data-size={size}
      data-style={variant}
      data-text-trim={trimText ? "on" : "off"}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
);

Badge.displayName = "Badge";

export default Badge;
