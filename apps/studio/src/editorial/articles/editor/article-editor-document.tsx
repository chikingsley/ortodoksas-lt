import type { JSONContent } from "@tiptap/core";
import { ImageIcon } from "lucide-react";
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
  resolveHeroUrl: (url: string) => string;
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
  resolveHeroUrl,
  summary,
  title,
}: Props) {
  return (
    <main className="min-w-0 px-[clamp(28px,5vw,72px)] pt-12 pb-24 max-md:px-[18px] max-md:pt-8 max-md:pb-14">
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

      {bodyHasLeadFigure ? null : (
        <section className="mx-auto mt-10 max-w-[860px]">
          <div className="mb-3 flex items-baseline justify-between max-sm:flex-col max-sm:items-start max-sm:gap-1">
            <strong className="font-semibold text-secondary-foreground text-xs">
              Lead image
            </strong>
          </div>
          {heroUrl ? (
            <img
              alt={`Lead for ${title}`}
              className={`block h-[280px] w-full rounded-lg bg-secondary ${heroFit === "contain" ? "object-contain" : "object-cover"}`}
              height="900"
              src={
                heroMediaId
                  ? `/api/media/${heroMediaId}`
                  : resolveHeroUrl(heroUrl)
              }
              style={{ objectPosition: `${heroFocalX}% ${heroFocalY}%` }}
              width="1600"
            />
          ) : (
            <div className="grid min-h-[180px] place-items-center rounded-lg border border-dashed bg-muted text-[13px] text-muted-foreground [&_svg]:mb-2 [&_svg]:w-6">
              <ImageIcon /> <span>This article has no lead image</span>
            </div>
          )}
        </section>
      )}

      <section className="mx-auto mt-10 max-w-[860px] [&_.simple-editor-wrapper]:overflow-clip [&_.simple-editor-wrapper]:rounded-xl [&_.simple-editor-wrapper]:border [&_.simple-editor-wrapper]:bg-card [&_.tiptap-toolbar[data-variant=fixed]]:top-16 max-md:[&_.tiptap-toolbar[data-variant=fixed]]:sticky max-md:[&_.tiptap-toolbar[data-variant=fixed]]:top-[102px] max-md:[&_.tiptap-toolbar[data-variant=fixed]]:h-[var(--tt-toolbar-height)] max-md:[&_.tiptap-toolbar[data-variant=fixed]]:border-t-0 max-md:[&_.tiptap-toolbar[data-variant=fixed]]:border-b max-md:[&_.tiptap-toolbar[data-variant=fixed]]:border-b-[var(--tt-toolbar-border-color)] max-md:[&_.tiptap-toolbar[data-variant=fixed]]:pb-0 [&_[data-youtube-video]]:my-6 [&_[data-youtube-video]]:aspect-video [&_[data-youtube-video]]:w-full [&_[data-youtube-video]_iframe]:size-full [&_[data-youtube-video]_iframe]:border-0">
        <div className="mb-3 flex items-baseline justify-between max-sm:flex-col max-sm:items-start max-sm:gap-1">
          <strong className="font-semibold text-secondary-foreground text-xs">
            Article body
          </strong>
          <span className="text-[11px] text-muted-foreground">
            Official Tiptap Simple Editor
          </span>
        </div>
        <SimpleEditor content={body} onUpdate={onBodyChange} />
      </section>
    </main>
  );
}
