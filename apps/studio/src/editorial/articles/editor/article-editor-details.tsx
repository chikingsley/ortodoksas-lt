import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { Check, ChevronDown, History, Trash2, X } from "lucide-react";
import type { ChangeEvent, MouseEvent } from "react";
import { useCallback } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { LanguageSelect } from "@/editorial/shared/language-select";
import { SectionSelect } from "@/editorial/shared/section-select";
import { TranslationBadge } from "@/editorial/shared/translation-badge";

import { formatPublicationStatus } from "../format-publication-status";
import type { Revision, StoredArticle } from "./article-editor-types";
import { ArticleSearchAppearance } from "./article-search-appearance";

interface Props {
  byline: string;
  bylineType: "organization" | "person";
  bylineUrl: string;
  changesCount: number;
  hasLeadImage: boolean;
  heroFit: "contain" | "cover";
  heroFocalX: number;
  heroFocalY: number;
  historyOpen: boolean;
  language: SiteLocale;
  onBylineChange: (value: string) => void;
  onBylineTypeChange: (value: "organization" | "person") => void;
  onBylineUrlChange: (value: string) => void;
  onDeleteDraft: () => void;
  onHeroFitChange: (value: "contain" | "cover") => void;
  onHeroFocalXChange: (value: number) => void;
  onHeroFocalYChange: (value: number) => void;
  onHistoryOpenChange: (open: boolean) => void;
  onMarkReviewed: () => void;
  onOpenChanges: () => void;
  onRestoreRevision: (event: MouseEvent<HTMLButtonElement>) => void;
  onSectionChange: (value: string) => void;
  onSeoDescriptionChange: (value: string) => void;
  onSeoTitleChange: (value: string) => void;
  publicPath: string;
  qualityIssues: string[];
  restoringVersion: number | null;
  revisions: Revision[];
  saveState: "saved" | "dirty" | "saving" | "error";
  section: string;
  seoDescription: string;
  seoTitle: string;
  status: StoredArticle["status"];
  summary: string;
  title: string;
  translationKind: StoredArticle["translationKind"];
  translationReviewStatus: StoredArticle["translationReviewStatus"];
}

const sectionClass =
  "border-b p-6 max-md:p-5 [&>h2]:mt-0 [&>h2]:mb-4 [&>h2]:text-sm [&>h2]:font-bold";

const keepEditionLanguage = () => {
  /* empty */
};

const revisionMetadataSchema = z.object({
  snapshotCompleteness: z.enum(["complete", "legacy_partial"]).optional(),
  title: z.string().optional(),
});

function ArticleStatusSection({
  historyOpen,
  onHistoryOpenChange,
  onMarkReviewed,
  onRestoreRevision,
  restoringVersion,
  revisions,
  saveState,
  status,
  translationKind,
  translationReviewStatus,
}: Pick<
  Props,
  | "historyOpen"
  | "onHistoryOpenChange"
  | "onMarkReviewed"
  | "onRestoreRevision"
  | "restoringVersion"
  | "revisions"
  | "saveState"
  | "status"
  | "translationKind"
  | "translationReviewStatus"
>) {
  const revisionEntries = revisions.map((revision) => ({
    metadata: revisionMetadataSchema.parse(JSON.parse(revision.metadata_json)),
    revision,
  }));

  const hasPartialRevision = revisionEntries.some(
    ({ metadata }) => metadata.snapshotCompleteness !== "complete"
  );

  return (
    <section className={sectionClass}>
      <h2>Status and history</h2>
      <dl className="[&_dt]:text-muted-foreground m-0 [&_dd]:m-0 [&_dd]:flex [&_dd]:items-center [&_dd]:gap-1.5 [&_dd]:font-semibold [&_dd]:capitalize [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:py-2 [&>div]:text-xs">
        <div>
          <dt>Status</dt>
          <dd>
            <i className="bg-primary size-2 rounded-full" />
            {formatPublicationStatus(status)}
          </dd>
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
        <p className="text-muted-foreground mt-2.5 mb-3.5 text-xs leading-relaxed">
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
      <Collapsible
        className="group/revision-history"
        onOpenChange={onHistoryOpenChange}
        open={historyOpen}
      >
        <CollapsibleTrigger
          render={
            <Button
              className="w-full justify-start"
              size="sm"
              type="button"
              variant="ghost"
            />
          }
        >
          <History /> Revision history
          <ChevronDown className="ml-auto transition-transform group-data-open/revision-history:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          {hasPartialRevision ? (
            <p className="text-muted-foreground mt-2 mb-1 text-xs leading-relaxed">
              Earlier versions preserve the fields recorded at the time. Newer
              fields keep their current values during restore.
            </p>
          ) : null}
          <ol className="mt-2 mb-0 list-none p-0">
            {revisionEntries.map(({ metadata, revision }, index) => (
              <li
                className="flex items-start justify-between gap-2 border-t py-2.5"
                key={revision.id}
              >
                <div className="[&>*]:block">
                  <strong className="text-xs">
                    Version {revision.version}
                  </strong>
                  <span className="text-muted-foreground mt-0.5 text-xs">
                    {new Date(revision.created_at).toLocaleString()} ·{" "}
                    {revision.editor_id}
                  </span>
                  <small className="text-muted-foreground mt-0.5 text-xs">
                    {metadata.title}
                  </small>
                </div>
                {index > 0 ? (
                  <Button
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
                  <em className="text-muted-foreground mt-0.5 text-xs">
                    Current
                  </em>
                )}
              </li>
            ))}
          </ol>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

export function ArticleEditorDetails({
  byline,
  bylineType,
  bylineUrl,
  changesCount,
  historyOpen,
  heroFit,
  heroFocalX,
  heroFocalY,
  hasLeadImage,
  language,
  onBylineChange,
  onBylineTypeChange,
  onBylineUrlChange,
  onHeroFitChange,
  onHeroFocalXChange,
  onHeroFocalYChange,
  onMarkReviewed,
  onDeleteDraft,
  onOpenChanges,
  onRestoreRevision,
  onSectionChange,
  onSeoDescriptionChange,
  onSeoTitleChange,
  onHistoryOpenChange,
  publicPath,
  qualityIssues,
  restoringVersion,
  revisions,
  saveState,
  section,
  seoDescription,
  seoTitle,
  status,
  summary,
  title,
  translationKind,
  translationReviewStatus,
}: Props) {
  const changeHeroFit = useCallback(
    (value: string | null) => {
      if (value === "contain" || value === "cover") {
        onHeroFitChange(value);
      }
    },
    [onHeroFitChange]
  );

  const changeHeroFocalX = useCallback(
    (value: number | readonly number[]) => {
      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Base UI Slider returns its typed scalar or readonly array union.
      const nextValue = typeof value === "number" ? value : value[0];

      if (nextValue !== undefined) {
        onHeroFocalXChange(nextValue);
      }
    },
    [onHeroFocalXChange]
  );

  const changeHeroFocalY = useCallback(
    (value: number | readonly number[]) => {
      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Base UI Slider returns its typed scalar or readonly array union.
      const nextValue = typeof value === "number" ? value : value[0];

      if (nextValue !== undefined) {
        onHeroFocalYChange(nextValue);
      }
    },
    [onHeroFocalYChange]
  );

  const changeByline = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onBylineChange(event.target.value);
    },
    [onBylineChange]
  );

  const changeBylineType = useCallback(
    (value: string | null) => {
      if (value === "organization" || value === "person") {
        onBylineTypeChange(value);
      }
    },
    [onBylineTypeChange]
  );

  const changeBylineUrl = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onBylineUrlChange(event.target.value);
    },
    [onBylineUrlChange]
  );

  return (
    <aside
      aria-label="Article details"
      className="bg-muted/30 min-w-0 border-l max-md:border-t max-md:border-l-0"
    >
      <ArticleStatusSection
        historyOpen={historyOpen}
        onHistoryOpenChange={onHistoryOpenChange}
        onMarkReviewed={onMarkReviewed}
        onRestoreRevision={onRestoreRevision}
        restoringVersion={restoringVersion}
        revisions={revisions}
        saveState={saveState}
        status={status}
        translationKind={translationKind}
        translationReviewStatus={translationReviewStatus}
      />

      <section className={sectionClass}>
        <h2>Automatic quality checks</h2>
        <div
          className={`mb-2 flex items-center gap-2 text-xs font-semibold [&_svg]:size-4 ${qualityIssues.length === 0 ? "text-success" : "text-destructive"}`}
        >
          {qualityIssues.length === 0 ? <Check /> : <X />}
          {qualityIssues.length === 0
            ? "All checks passed"
            : `${qualityIssues.length} issues found`}
        </div>
        {qualityIssues.length > 0 ? (
          <ul className="border-destructive/20 bg-destructive/5 text-destructive mt-0 mb-3.5 rounded-md border py-2.5 pr-2.5 pl-7 text-xs leading-relaxed">
            {qualityIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}
        <div className="grid gap-2 [&_button]:w-full">
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
        className={`${sectionClass} [&_[data-slot=select-trigger]]:w-full [&>label]:mt-3.5 [&>label]:mb-1.5 [&>label]:block [&>label]:text-xs [&>label]:font-semibold`}
      >
        <h2>Publication</h2>
        <label htmlFor="review-language">Language</label>
        <LanguageSelect
          disabled
          id="review-language"
          onChange={keepEditionLanguage}
          value={language}
        />
        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
          Language is fixed for this edition. Create another language from the
          translation workflow.
        </p>
        <label htmlFor="review-section">Section</label>
        <SectionSelect
          id="review-section"
          language={language}
          onChange={onSectionChange}
          value={section}
        />
        <label htmlFor="article-byline">Author or byline</label>
        <Input
          id="article-byline"
          maxLength={200}
          onChange={changeByline}
          placeholder="Person or institution"
          value={byline}
        />
        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
          This public byline stays separate from the signed-in editor account.
        </p>
        {byline.trim() ? (
          <>
            <label htmlFor="article-byline-type">Author type</label>
            <Select onValueChange={changeBylineType} value={bylineType}>
              <SelectTrigger className="w-full" id="article-byline-type">
                <SelectValue>
                  {bylineType === "person" ? "Person" : "Organization"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                <SelectItem value="person">Person</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
              </SelectContent>
            </Select>
            <label htmlFor="article-byline-url">Author profile URL</label>
            <Input
              id="article-byline-url"
              maxLength={4096}
              onChange={changeBylineUrl}
              placeholder="https://…"
              type="url"
              value={bylineUrl}
            />
          </>
        ) : null}
        <span className="mt-3.5 mb-1.5 block text-xs font-semibold">
          Public path
        </span>
        <code className="bg-card block w-full overflow-hidden rounded-md border px-2.5 py-2 text-xs text-ellipsis whitespace-nowrap">
          /{publicPath}
        </code>
      </section>

      <section className={sectionClass}>
        <h2>Search appearance</h2>
        <ArticleSearchAppearance
          key={revisions[0]?.id ?? "unsaved"}
          onSeoDescriptionChange={onSeoDescriptionChange}
          onSeoTitleChange={onSeoTitleChange}
          publicPath={publicPath}
          seoDescription={seoDescription}
          seoTitle={seoTitle}
          summary={summary}
          title={title}
        />
      </section>

      {hasLeadImage ? (
        <section className={sectionClass}>
          <h2>Lead image framing</h2>
          <label
            className="mb-1.5 block text-xs font-semibold"
            htmlFor="hero-fit"
          >
            Frame fit
          </label>
          <Select onValueChange={changeHeroFit} value={heroFit}>
            <SelectTrigger className="w-full" id="hero-fit">
              <SelectValue>
                {heroFit === "cover" ? "Fill frame (crop)" : "Show full image"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              <SelectItem value="cover">Fill frame (crop)</SelectItem>
              <SelectItem value="contain">Show full image</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-muted-foreground mt-2 mb-4 text-xs leading-relaxed">
            Fill frame uses the focus point for homepage cards. Show full image
            keeps the complete artwork visible.
          </p>
          {heroFit === "cover" ? (
            <div className="grid gap-4">
              <div className="grid gap-2 text-xs">
                <span className="flex justify-between">
                  <span>Horizontal focus</span>
                  <strong>{heroFocalX}%</strong>
                </span>
                <Slider
                  aria-label="Horizontal focus"
                  max={100}
                  min={0}
                  onValueChange={changeHeroFocalX}
                  step={1}
                  value={[heroFocalX]}
                />
              </div>
              <div className="grid gap-2 text-xs">
                <span className="flex justify-between">
                  <span>Vertical focus</span>
                  <strong>{heroFocalY}%</strong>
                </span>
                <Slider
                  aria-label="Vertical focus"
                  max={100}
                  min={0}
                  onValueChange={changeHeroFocalY}
                  step={1}
                  value={[heroFocalY]}
                />
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {status === "draft" ? (
        <section className={sectionClass}>
          <h2>Draft actions</h2>
          <Button
            className="w-full"
            onClick={onDeleteDraft}
            variant="destructive"
          >
            <Trash2 /> Delete draft
          </Button>
        </section>
      ) : null}
    </aside>
  );
}
