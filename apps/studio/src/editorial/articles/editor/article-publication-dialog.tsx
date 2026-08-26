import {
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { StudioDialog } from "@/editorial/shared/studio-dialog";

import type { PublicationVerification } from "./article-editor-types";

interface Props {
  errorMessage: string | null;
  onAction: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  publicationState:
    | "error"
    | "idle"
    | "published_unverified"
    | "verified"
    | "working";
  publishingChanges: boolean;
  qualityIssues: string[];
  title: string;
  verification: PublicationVerification | null;
}

export function ArticlePublicationDialog({
  errorMessage,
  onAction,
  onOpenChange,
  open,
  publicationState,
  publishingChanges,
  qualityIssues,
  title,
  verification,
}: Props) {
  const qualityReady = qualityIssues.length === 0;
  const working = publicationState === "working";
  const actionLabel = publishingChanges ? "Publish now" : "Verify live article";
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <StudioDialog
      description="The server repeats every editorial quality check before publication."
      onOpenChange={onOpenChange}
      open={open}
      popupClassName="w-[min(620px,100%)] grid-rows-[auto_minmax(0,1fr)]"
      title={publishingChanges ? "Publish article" : "Published article"}
    >
      <div className="grid gap-5 overflow-auto p-5">
        <div>
          <p className="m-0 text-sm leading-6">
            <strong>{title || "Untitled article"}</strong>
          </p>
          <p className="mt-1 mb-0 text-muted-foreground text-xs leading-5">
            {publishingChanges
              ? "Publication writes the approved article to the live catalog and records a new revision."
              : "Verify that the current public URL resolves successfully."}
          </p>
        </div>

        {qualityReady ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-success/20 bg-success-muted p-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 size-4 flex-none" />
            <span>Every automatic quality check passes.</span>
          </div>
        ) : (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive">
            <div className="flex items-start gap-2.5 text-sm">
              <TriangleAlert className="mt-0.5 size-4 flex-none" />
              <strong>
                Resolve {qualityIssues.length} quality finding
                {qualityIssues.length === 1 ? "" : "s"} before publication.
              </strong>
            </div>
            <ul className="mt-2 mb-0 grid gap-1 pl-7 text-xs leading-5">
              {qualityIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {publicationState === "verified" && verification ? (
          <div className="rounded-lg border border-success/20 bg-success-muted p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-success">
              <CheckCircle2 className="size-4" /> Live article verified
            </div>
            <a
              className="mt-2 inline-flex items-center gap-1.5 break-all text-xs underline"
              href={verification.url}
              rel="noopener"
              target="_blank"
            >
              {verification.url} <ExternalLink className="size-3" />
            </a>
          </div>
        ) : null}

        {publicationState === "published_unverified" && verification ? (
          <div className="rounded-lg border border-amber-600/25 bg-amber-500/10 p-3 text-sm">
            <strong>
              Publication saved; live verification is still settling.
            </strong>
            <a
              className="mt-2 block break-all text-xs underline"
              href={verification.url}
              rel="noopener"
              target="_blank"
            >
              Open the public article
            </a>
          </div>
        ) : null}

        {publicationState === "error" && errorMessage ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive text-sm">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button onClick={close} variant="outline">
            Close
          </Button>
          {publicationState === "verified" ? null : (
            <Button
              disabled={working || (publishingChanges && !qualityReady)}
              onClick={onAction}
            >
              {working ? <LoaderCircle className="animate-spin" /> : null}
              {working ? <span>Checking…</span> : <span>{actionLabel}</span>}
            </Button>
          )}
        </div>
      </div>
    </StudioDialog>
  );
}
