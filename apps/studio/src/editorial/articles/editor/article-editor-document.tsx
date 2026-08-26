import type { JSONContent } from "@tiptap/core";
import type { ChangeEvent } from "react";

import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { AutoResizeTextarea } from "@/editorial/shared/auto-resize-textarea";

interface Props {
  body: JSONContent;
  bodyHasLeadFigure: boolean;
  heroFit: "contain" | "cover";
  heroFocalX: number;
  heroFocalY: number;
  heroMediaId: string | null;
  heroUrl: string | null;
  onBodyChange: (body: JSONContent) => void;
  onSummaryChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onTitleChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  summary: string;
  title: string;
}

export function ArticleEditorDocument({
  body,
  bodyHasLeadFigure,
  heroMediaId,
  heroFit,
  heroFocalX,
  heroFocalY,
  heroUrl,
  onBodyChange,
  onSummaryChange,
  onTitleChange,
  summary,
  title,
}: Props) {
  return (
    <div className="min-w-0 px-[clamp(28px,5vw,72px)] pt-12 pb-24 max-md:px-4 max-md:pt-7 max-md:pb-12">
      <div className="relative mx-auto grid max-w-[860px] gap-2 [&_label]:font-semibold [&_label]:text-secondary-foreground [&_label]:text-xs [&_textarea:first-of-type]:mb-6 [&_textarea:first-of-type]:h-auto [&_textarea:first-of-type]:min-h-[1.2em] [&_textarea:first-of-type]:resize-none [&_textarea:first-of-type]:overflow-hidden [&_textarea:first-of-type]:font-bold [&_textarea:first-of-type]:text-[clamp(34px,4.3vw,56px)] [&_textarea:first-of-type]:leading-none [&_textarea:first-of-type]:tracking-[-0.035em] [&_textarea:last-of-type:focus]:border-primary [&_textarea:last-of-type:focus]:shadow-[0_1px_0_var(--primary)] [&_textarea:last-of-type]:min-h-[88px] [&_textarea:last-of-type]:resize-y [&_textarea:last-of-type]:border-b [&_textarea:last-of-type]:py-3 [&_textarea:last-of-type]:text-lg [&_textarea:last-of-type]:leading-relaxed [&_textarea]:w-full [&_textarea]:rounded-none [&_textarea]:border-0 [&_textarea]:bg-transparent [&_textarea]:p-0 [&_textarea]:text-foreground [&_textarea]:outline-none">
        <label htmlFor="review-title">Title</label>
        <AutoResizeTextarea
          id="review-title"
          onChange={onTitleChange}
          value={title}
        />
        <label htmlFor="review-summary">Summary</label>
        <textarea
          id="review-summary"
          maxLength={600}
          onChange={onSummaryChange}
          rows={3}
          value={summary}
        />
        <span className="-mt-1 justify-self-end text-[11px] text-muted-foreground">
          {summary.length} / 600
        </span>
      </div>

      {bodyHasLeadFigure || !(heroMediaId || heroUrl) ? null : (
        <section className="mx-auto mt-10 max-w-[860px]">
          <div className="mb-3 flex items-baseline justify-between max-sm:flex-col max-sm:items-start max-sm:gap-1">
            <strong className="font-semibold text-secondary-foreground text-xs">
              Lead image
            </strong>
          </div>
          <img
            alt={`Lead for ${title}`}
            className={`block h-[280px] w-full rounded-lg bg-secondary ${heroFit === "contain" ? "object-contain" : "object-cover"}`}
            height="900"
            src={heroMediaId ? `/api/media/${heroMediaId}` : (heroUrl ?? "")}
            style={{ objectPosition: `${heroFocalX}% ${heroFocalY}%` }}
            width="1600"
          />
        </section>
      )}

      <section className="mx-auto mt-10 max-w-[860px] [&_.simple-editor-wrapper]:overflow-clip [&_.simple-editor-wrapper]:rounded-xl [&_.simple-editor-wrapper]:border [&_.simple-editor-wrapper]:bg-card [&_[data-youtube-video]]:my-6 [&_[data-youtube-video]]:aspect-video [&_[data-youtube-video]]:w-full [&_[data-youtube-video]_iframe]:size-full [&_[data-youtube-video]_iframe]:border-0">
        <div className="mb-3 flex items-baseline justify-between">
          <strong className="font-semibold text-secondary-foreground text-xs">
            Article body
          </strong>
        </div>
        <SimpleEditor content={body} onUpdate={onBodyChange} />
      </section>
    </div>
  );
}
