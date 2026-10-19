import { memo } from "react";

import { ChevronDownIcon } from "@/components/tiptap-icons/chevron-down-icon";

type SvgProps = React.ComponentPropsWithoutRef<"svg">;

export const ChevronUpIcon = memo(({ className, ...props }: SvgProps) => (
  <ChevronDownIcon
    className={`origin-center rotate-180 ${className ?? ""}`}
    {...props}
  />
));

ChevronUpIcon.displayName = "ChevronUpIcon";
