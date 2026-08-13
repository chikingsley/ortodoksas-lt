import { Check, ChevronDown, History, X } from "lucide-react";
import { type ChangeEvent, type MouseEvent, useCallback } from "react";

import { Button } from "@/components/ui/button";

import type { Revision, StoredArticle } from "./article-editor-types";
import { formatPublicationStatus } from "./format-publication-status";
import { LanguageSelect } from "./language-select";
import { SectionSelect } from "./section-select";
import { TranslationBadge } from "./translation-badge";

interface Props {
  changesCount: number;
  heroFit: "contain" | "cover";
  heroFocalX: number;
  heroFocalY: number;
  historyOpen: boolean;
  language: string;
  onHeroFitChange: (value: "contain" | "cover") => void;
  onHeroFocalXChange: (value: number) => void;
  onHeroFocalYChange: (value: number) => void;
  onLanguageChange: (value: string) => void;
  onMarkReviewed: () => void;
  onOpenChanges: () => void;
  onOpenSource: () => void;
  onRestoreRevision: (event: MouseEvent<HTMLButtonElement>) => void;
  onSectionChange: (value: string) => void;
  onToggleHistory: () => void;
  publicPath: string;
  qualityIssues: string[];
  restoringVersion: number | null;
  revisions: Revision[];
  saveState: "saved" | "dirty" | "saving" | "error";
  section: string;
  sourceName: string;
  status: StoredArticle["status"];
  translationKind: StoredArticle["translationKind"];
  translationReviewStatus: StoredArticle["translationReviewStatus"];
}

const sectionClass =
  "border-b p-6 max-md:p-5 [&>h2]:mt-0 [&>h2]:mb-4 [&>h2]:text-[13px] [&>h2]:font-bold";

export function ArticleEditorInspector({
  changesCount,
  historyOpen,
  heroFit,
  heroFocalX,
  heroFocalY,
  language,
  onLanguageChange,
  onHeroFitChange,
  onHeroFocalXChange,
  onHeroFocalYChange,
  onMarkReviewed,
  onOpenChanges,
  onOpenSource,
  onRestoreRevision,
  onSectionChange,
  onToggleHistory,
  publicPath,
  qualityIssues,
  restoringVersion,
  revisions,
  saveState,
  section,
  sourceName,
  status,
  translationKind,
  translationReviewStatus,
}: Props) {
  const changeHeroFit = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) =>
      onHeroFitChange(event.target.value as "contain" | "cover"),
    [onHeroFitChange]
  );
  const changeHeroFocalX = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      onHeroFocalXChange(Number(event.target.value)),
    [onHeroFocalXChange]
  );
  const changeHeroFocalY = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      onHeroFocalYChange(Number(event.target.value)),
    [onHeroFocalYChange]
  );

  return (
    <aside className="min-w-0 border-l bg-muted/30 max-md:border-t max-md:border-l-0">
      <section className={sectionClass}>
        <h2>Workflow</h2>
        <dl className="m-0 [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:py-2 [&>div]:text-xs [&_dd]:m-0 [&_dd]:flex [&_dd]:items-center [&_dd]:gap-1.5 [&_dd]:font-semibold [&_dd]:capitalize [&_dt]:text-muted-foreground">
          <div>
            <dt>Status</dt>
            <dd>
              <i className="size-2 rounded-full bg-primary" />
              {formatPublicationStatus(status)}
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{sourceName}</dd>
          </div>
          <div>
            <dt>Translation</dt>
            <dd>
              <TranslationBadge
                kind={translationKind}
                reviewStatus={translationReviewStatus}
              />
            </dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{revisions[0]?.version ?? "Unsaved"}</dd>
          </div>
        </dl>
        {revisions[0] ? (
          <p className="mt-2.5 mb-3.5 text-[11px] text-muted-foreground leading-relaxed">
            Saved {new Date(revisions[0].created_at).toLocaleString()} by{" "}
            {revisions[0].editor_id}
          </p>
        ) : null}
        {translationKind !== "original" &&
        translationReviewStatus !== "approved" ? (
          <Button
            disabled={saveState === "saving"}
            onClick={onMarkReviewed}
            variant="outline"
          >
            <Check /> Mark editor reviewed
          </Button>
        ) : null}
        <button
          className="flex w-full items-center gap-2 border-0 bg-transparent px-0 py-2 font-semibold text-secondary-foreground text-xs [&_svg:last-child]:ml-auto [&_svg]:size-4"
          onClick={onToggleHistory}
          type="button"
        >
          <History /> Revision history <ChevronDown />
        </button>
        {historyOpen ? (
          <ol className="mt-2 mb-0 list-none p-0">
            {revisions.map((revision, index) => {
              const metadata = JSON.parse(revision.metadata_json) as {
                title: string;
              };
              return (
                <li
                  className="flex items-start justify-between gap-2 border-t py-2.5"
                  key={revision.id}
                >
                  <div className="[&>*]:block">
                    <strong className="text-xs">
                      Version {revision.version}
                    </strong>
                    <span className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(revision.created_at).toLocaleString()} ·{" "}
                      {revision.editor_id}
                    </span>
                    <small className="mt-0.5 text-[10px] text-muted-foreground">
                      {metadata.title}
                    </small>
                  </div>
                  {index > 0 ? (
                    <Button
                      className="h-auto px-1.5 py-1 text-[10px]"
                      data-version={revision.version}
                      disabled={restoringVersion !== null}
                      onClick={onRestoreRevision}
                      size="xs"
                      type="button"
                      variant="outline"
                    >
                      {restoringVersion === revision.version
                        ? "Restoring…"
                        : "Restore"}
                    </Button>
                  ) : (
                    <em className="mt-0.5 text-[10px] text-muted-foreground">
                      Current
                    </em>
                  )}
                </li>
              );
            })}
          </ol>
        ) : null}
      </section>

      <section className={sectionClass}>
        <h2>Automatic quality checks</h2>
        <div
          className={`mb-2 flex items-center gap-2 font-semibold text-xs [&_svg]:size-4 ${qualityIssues.length === 0 ? "text-primary" : "text-destructive"}`}
        >
          {qualityIssues.length === 0 ? <Check /> : <X />}
          {qualityIssues.length === 0
            ? "All checks passed"
            : `${qualityIssues.length} issues found`}
        </div>
        {qualityIssues.length > 0 ? (
          <ul className="mt-0 mb-3.5 rounded-md border border-destructive/20 bg-destructive/5 py-2.5 pr-2.5 pl-7 text-[11px] text-destructive leading-relaxed">
            {qualityIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}
        <div className="grid gap-2 [&_button]:w-full">
          <Button onClick={onOpenSource} variant="outline">
            Compare source
          </Button>
          <Button
            disabled={changesCount === 0}
            onClick={onOpenChanges}
            variant="outline"
          >
            {changesCount === 0
              ? "No editorial changes"
              : `View ${changesCount} changes`}
          </Button>
        </div>
      </section>

      <section
        className={`${sectionClass} [&>label]:mt-3.5 [&>label]:mb-1.5 [&>label]:block [&>label]:font-semibold [&>label]:text-xs [&_[data-slot=select-trigger]]:w-full`}
      >
        <h2>Publication</h2>
        <label htmlFor="review-language">Language</label>
        <LanguageSelect
          id="review-language"
          onChange={onLanguageChange}
          value={language}
        />
        <label htmlFor="review-section">Section</label>
        <SectionSelect
          id="review-section"
          language={language}
          onChange={onSectionChange}
          value={section}
        />
        <span className="mt-3.5 mb-1.5 block font-semibold text-xs">
          Public path
        </span>
        <code className="block w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-md border bg-card px-2.5 py-2 text-xs">
          /{publicPath}
        </code>
      </section>

      <section className={sectionClass}>
        <h2>Hero presentation</h2>
        <label
          className="mb-1.5 block font-semibold text-xs"
          htmlFor="hero-fit"
        >
          Image treatment
        </label>
        <select
          className="h-9 w-full rounded-md border bg-card px-2.5 text-xs"
          id="hero-fit"
          onChange={changeHeroFit}
          value={heroFit}
        >
          <option value="cover">Editorial crop</option>
          <option value="contain">Preserve complete artwork</option>
        </select>
        <p className="mt-2 mb-4 text-[11px] text-muted-foreground leading-relaxed">
          Editorial crop fills homepage frames. Preserve complete artwork keeps
          icons, seals, diagrams, and sacred art fully visible.
        </p>
        {heroFit === "cover" ? (
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-xs" htmlFor="hero-focal-x">
              <span className="flex justify-between">
                <span>Horizontal focus</span>
                <strong>{heroFocalX}%</strong>
              </span>
              <input
                id="hero-focal-x"
                max="100"
                min="0"
                onChange={changeHeroFocalX}
                type="range"
                value={heroFocalX}
              />
            </label>
            <label className="grid gap-1.5 text-xs" htmlFor="hero-focal-y">
              <span className="flex justify-between">
                <span>Vertical focus</span>
                <strong>{heroFocalY}%</strong>
              </span>
              <input
                id="hero-focal-y"
                max="100"
                min="0"
                onChange={changeHeroFocalY}
                type="range"
                value={heroFocalY}
              />
            </label>
          </div>
        ) : null}
      </section>
    </aside>
  );
}
