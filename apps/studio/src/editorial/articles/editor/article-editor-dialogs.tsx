import { StudioDialog } from "@/editorial/shared/studio-dialog";
import type { ContentChange } from "./article-editor-types";

interface Props {
  changes: ContentChange[];
  changesOpen: boolean;
  onChangesOpenChange: (open: boolean) => void;
  onPreviewOpenChange: (open: boolean) => void;
  onSourceOpenChange: (open: boolean) => void;
  previewDocument: string;
  previewOpen: boolean;
  sourceHtml: string;
  sourceOpen: boolean;
  warnings: string[];
}

const FIGURE_FIELD_PATTERN = /^body\.figure\[(\d+)\]\.(alt|caption)$/u;
const FIELD_LABELS: Record<string, string> = {
  summary: "Summary",
  title: "Title",
};

const formatField = (fieldPath: string): string => {
  const directLabel = FIELD_LABELS[fieldPath];
  if (directLabel) {
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
  onSourceOpenChange,
  previewDocument,
  previewOpen,
  sourceHtml,
  sourceOpen,
  warnings,
}: Props) {
  return (
    <>
      <StudioDialog
        description="Canonical Tiptap JSON rendered through the shared renderer"
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
        description="Original page beside the current editor result"
        onOpenChange={onSourceOpenChange}
        open={sourceOpen}
        popupClassName="w-[min(1440px,100%)] grid-rows-[auto_minmax(0,1fr)_auto]"
        title="Source comparison"
      >
        <div className="grid min-h-0 grid-cols-2 overflow-hidden max-md:grid-cols-1 max-md:overflow-auto [&>section+section]:border-l max-md:[&>section+section]:border-t max-md:[&>section+section]:border-l-0 [&>section]:grid [&>section]:min-h-0 [&>section]:grid-rows-[auto_minmax(0,1fr)] max-md:[&>section]:min-h-[520px] [&_h2]:m-0 [&_h2]:border-b [&_h2]:bg-muted [&_h2]:px-4 [&_h2]:py-2.5 [&_h2]:text-xs [&_iframe]:size-full [&_iframe]:border-0">
          <section>
            <h2>Original source</h2>
            <iframe sandbox="" srcDoc={sourceHtml} title="Original source" />
          </section>
          <section>
            <h2>Canonical result</h2>
            <iframe
              sandbox=""
              srcDoc={previewDocument}
              title="Canonical result"
            />
          </section>
        </div>
        {warnings.length > 0 ? (
          <footer className="max-h-[132px] overflow-auto border-t px-5 py-3.5 text-xs">
            <div className="flex items-baseline justify-between">
              <strong>Source notes</strong>
              <span className="text-[11px] text-muted-foreground">
                {warnings.length} issues detected
              </span>
            </div>
            <ol className="mt-2.5 mb-0 grid list-none gap-1.5 p-0 text-muted-foreground">
              {warnings.map((warning, index) => (
                <li
                  className="grid grid-cols-[20px_minmax(0,1fr)] items-start gap-2"
                  key={warning}
                  title={warning}
                >
                  <b className="grid size-[18px] place-items-center rounded-full bg-accent text-[10px] text-primary">
                    {index + 1}
                  </b>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {warning}
                  </span>
                </li>
              ))}
            </ol>
          </footer>
        ) : null}
      </StudioDialog>

      <StudioDialog
        description="Original source compared with the current article"
        onOpenChange={onChangesOpenChange}
        open={changesOpen}
        popupClassName="w-[min(1440px,100%)] grid-rows-[auto_minmax(0,1fr)_auto]"
        title="Editorial changes"
      >
        {changes.length === 0 ? (
          <div className="flex min-h-[calc(100vh-64px)] items-center justify-center gap-2.5 text-muted-foreground text-sm">
            The current article matches its original source.
          </div>
        ) : (
          <ol className="m-0 grid auto-rows-max content-start gap-4 overflow-auto p-5">
            {changes.map((change) => (
              <li
                className="list-none overflow-hidden rounded-xl border"
                key={`${change.field_path}-${change.change_kind}`}
              >
                <div className="flex items-center gap-3 bg-muted px-4 py-3 [&>span]:rounded-full [&>span]:border [&>span]:px-2 [&>span]:py-1 [&>span]:text-xs [&>span]:capitalize [&>strong]:mr-auto">
                  <strong>{formatField(change.field_path)}</strong>
                  <span>{change.change_kind}</span>
                  <span>{formatProvenance(change.provenance)}</span>
                </div>
                <dl className="[&_dd]:break-anywhere m-0 grid grid-cols-2 [&>div+div]:border-l [&>div]:min-w-0 [&>div]:p-4 [&_dd]:m-0 [&_dd]:whitespace-pre-wrap [&_dd]:leading-normal [&_dt]:mb-1.5 [&_dt]:font-bold [&_dt]:text-muted-foreground [&_dt]:text-xs [&_dt]:uppercase">
                  <div>
                    <dt>Original</dt>
                    <dd>{change.before_value || "Empty"}</dd>
                  </div>
                  <div>
                    <dt>Current</dt>
                    <dd>{change.after_value || "Empty"}</dd>
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
