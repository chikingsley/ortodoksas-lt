import type { ChangeEventHandler, ComponentProps } from "react";
import { Textarea } from "@/components/ui/textarea";

interface Props extends Omit<ComponentProps<typeof Textarea>, "onChange"> {
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  value: string;
}

export function AutoResizeTextarea({ onChange, value, ...props }: Props) {
  return <Textarea {...props} onChange={onChange} rows={1} value={value} />;
}
