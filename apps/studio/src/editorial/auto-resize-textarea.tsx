import {
  type ChangeEventHandler,
  type ComponentProps,
  useCallback,
  useLayoutEffect,
  useState,
} from "react";
import { Textarea } from "@/components/ui/textarea";

interface Props extends Omit<ComponentProps<typeof Textarea>, "onChange"> {
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  value: string;
}

const fitContent = (element: HTMLTextAreaElement): void => {
  element.style.height = "0px";
  element.style.height = `${element.scrollHeight}px`;
};

export function AutoResizeTextarea({ onChange, value, ...props }: Props) {
  const [textarea, setTextarea] = useState<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    if (textarea?.value === value) {
      fitContent(textarea);
    }
  }, [textarea, value]);

  const updateValue = useCallback<ChangeEventHandler<HTMLTextAreaElement>>(
    (event) => {
      fitContent(event.currentTarget);
      onChange(event);
    },
    [onChange]
  );

  return (
    <Textarea
      {...props}
      onChange={updateValue}
      ref={setTextarea}
      rows={1}
      value={value}
    />
  );
}
