import { cn } from "@/lib/tiptap-utils";
import "@/components/tiptap-ui-primitive/input/input.scss";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn("tiptap-input", className)}
      data-slot="tiptap-input"
      type={type}
      {...props}
    />
  );
}

export { Input };
