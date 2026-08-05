import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/tiptap-utils";

import "./switch.scss";

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      className={cn("tiptap-switch", className)}
      data-size={size}
      data-slot="tiptap-switch"
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="tiptap-switch-thumb"
        data-slot="tiptap-switch-thumb"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
