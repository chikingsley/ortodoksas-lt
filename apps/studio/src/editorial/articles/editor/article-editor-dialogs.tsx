import { firstText, hasText } from "@ortodoksas-lt/content/value";

import { StudioDialog } from "@/editorial/shared/studio-dialog";

import type { ContentChange } from "./article-editor-types";

interface Props {
  changes: ContentChange[];
  changesOpen: boolean;
  onChangesOpenChange: (open: boolean) => void;
  onPreviewOpenChange: (open: boolean) => void;
  previewDocument: string;
  previewOpen: boolean;
}

const FIGURE_FIELD_PATTERN =
  /^body\.figure\[(?<index>\d+)\]\.(?<field>alt|caption)$/u;

const FIELD_LABELS = new Map<string, string>([
  ["summary", "Summary"],
  ["title", "Title"],
]);

const formatField = (fieldPath: string): string => {
  const directLabel = FIELD_LABELS.get(fieldPath);

  if (hasText(directLabel)) {
    return directLabel;
  }

  const figureMatch = FIGURE_FIELD_PATTERN.exec(fieldPath);

  if (figureMatch) {
    const [, figureNumber, field] = figureMatch;

    return `Figure ${figureNumber} ${field === "alt" ? "alternative text" : "caption"}`;
  }

  return fieldPath;
};

const formatProvenance = (provenance: ContentChange["provenance"]): string =>
  ({
    generated: "Automated",
    manual: "Editor",
    normalized: "System cleanup",
  })[provenance];

export function ArticleEditorDialogs({
  changes,
  changesOpen,
  onChangesOpenChange,
  onPreviewOpenChange,
  previewDocument,
  previewOpen,
}: Props) {
  return (
    <>
      <StudioDialog
        description="Preview the article with the public site’s formatting."
        onOpenChange={onPreviewOpenChange}
        open={previewOpen}
        title="Public article preview"
      >
        <iframe
          className="size-full border-0"
          sandbox=""
          srcDoc={previewDocument}
          title="Article preview"
        />
      </StudioDialog>

      <StudioDialog
        description="Review edits to the article’s text and images."
        onOpenChange={onChangesOpenChange}
        open={changesOpen}
        popupClassName="w-[min(1440px,100%)] grid-rows-[auto_minmax(0,1fr)_auto]"
        title="Editorial changes"
      >
        {changes.length === 0 ? (
          <div className="text-muted-foreground flex min-h-[calc(100vh-64px)] items-center justify-center gap-2.5 text-sm">
            The article matches its saved version.
          </div>
        ) : (
          <ol className="m-0 grid auto-rows-max content-start gap-4 overflow-auto p-5">
            {changes.map((change) => (
              <li
                className="list-none overflow-hidden rounded-xl border"
                key={`${change.field_path}-${change.change_kind}`}
              >
                <div className="bg-muted flex items-center gap-3 px-4 py-3 [&>span]:rounded-full [&>span]:border [&>span]:px-2 [&>span]:py-1 [&>span]:text-xs [&>span]:capitalize [&>strong]:mr-auto">
                  <strong>{formatField(change.field_path)}</strong>
                  <span>{change.change_kind}</span>
                  <span>{formatProvenance(change.provenance)}</span>
                </div>
                <dl className="[&_dt]:text-muted-foreground m-0 grid grid-cols-2 [&_dd]:m-0 [&_dd]:leading-normal [&_dd]:wrap-anywhere [&_dd]:whitespace-pre-wrap [&_dt]:mb-1.5 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&>div]:min-w-0 [&>div]:p-4 [&>div+div]:border-l">
                  <div>
                    <dt>Original</dt>
                    <dd>{firstText(change.before_value, "Empty")}</dd>
                  </div>
                  <div>
                    <dt>Current</dt>
                    <dd>{firstText(change.after_value, "Empty")}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        )}
      </StudioDialog>
    </>
  );
}
