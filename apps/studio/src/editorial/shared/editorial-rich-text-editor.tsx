import type { JSONContent } from "@tiptap/core";

import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";

interface Props {
  ariaLabel?: string;
  className?: string;
  content: JSONContent;
  onUpdate: (content: JSONContent) => void;
  purpose: "article" | "biography";
}

export function EditorialRichTextEditor({
  ariaLabel,
  className,
  content,
  onUpdate,
  purpose,
}: Props) {
  return (
    <SimpleEditor
      ariaLabel={ariaLabel}
      className={className}
      content={content}
      onUpdate={onUpdate}
      variant={purpose === "article" ? "article" : "compact"}
    />
  );
}
