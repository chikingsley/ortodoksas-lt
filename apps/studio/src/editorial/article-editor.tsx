import { tiptapDocumentSchema } from "@ortodoksas-lt/content/article";
import {
  resolveRecoveredMediaUrl,
  resolveTiptapMediaUrls,
} from "@ortodoksas-lt/content/media-url";
import { getArticleQualityIssues } from "@ortodoksas-lt/editor/quality";
import { renderArticleDocument } from "@ortodoksas-lt/editor/render";
import type { JSONContent } from "@tiptap/core";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  History,
  ImageIcon,
  LoaderCircle,
  Save,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { Button } from "@/components/ui/button";

import { AutoResizeTextarea } from "./auto-resize-textarea";
import { formatPublicationStatus } from "./format-publication-status";
import { LanguageSelect } from "./language-select";
import { SectionSelect } from "./section-select";
import { formatTranslationLabel } from "./translation-label";
import type { CatalogArticle, SourceArticle } from "./types";

interface Props {
  article: CatalogArticle;
  onBack: () => void;
  onOpenTranslation: (article: CatalogArticle) => void;
  translations: CatalogArticle[];
}

interface StoredArticle {
  bodyJson: string;
  heroMediaId: string | null;
  id: string;
  kind: "article" | "page";
  labelsJson: string;
  language: string;
  publishedAt: number | null;
  section: string;
  slug: string;
  sourceCapture: string | null;
  sourceHtml: string | null;
  sourceUrl: string | null;
  status: "draft" | "scheduled" | "published" | "archived";
  summary: string;
  title: string;
  translationGroupId: string;
  translationKind: "original" | "human" | "machine";
  translationReviewedAt: number | null;
  translationReviewedBy: string | null;
  translationReviewStatus:
    | "approved"
    | "changes_requested"
    | "not_required"
    | "pending";
  translationSourceArticleId: string | null;
  translationSourceHash: string | null;
}

interface ArticleResponse {
  article: StoredArticle;
}

interface BaselineResponse {
  baseline: {
    body_json: string;
  };
  changes: ContentChange[];
}

interface ContentChange {
  after_value: string | null;
  before_value: string | null;
  change_kind: "added" | "changed" | "removed";
  field_path: string;
  provenance: "generated" | "manual" | "normalized";
}

interface Revision {
  created_at: number;
  editor_id: string;
  id: string;
  metadata_json: string;
  version: number;
}

interface PersistArticleInput {
  articleId: string | null;
  baseline: {
    body: JSONContent;
    converterVersion: string;
    summary: string;
    title: string;
  };
  payload: Record<string, unknown>;
  sourceArticleId: string;
}

const EMPTY_DOCUMENT: JSONContent = {
  content: [{ type: "paragraph" }],
  type: "doc",
};
const LEADING_SLASH_PATTERN = /^\/+/;
const LITHUANIAN_PREFIX_PATTERN = /^lt\//;
const TRAILING_SLASH_PATTERN = /\/$/;
const CHANGE_FIGURE_FIELD_PATTERN = /^body\.figure\[(\d+)\]\.(alt|caption)$/u;
const WWW_PREFIX_PATTERN = /^www\./u;
const EDITION_LANGUAGES = ["lt", "en", "ru", "uk", "be"] as const;

const CHANGE_FIELD_LABELS: Record<string, string> = {
  summary: "Summary",
  title: "Title",
};

const formatChangeField = (fieldPath: string): string => {
  const directLabel = CHANGE_FIELD_LABELS[fieldPath];
  if (directLabel) {
    return directLabel;
  }
  const figureMatch = CHANGE_FIGURE_FIELD_PATTERN.exec(fieldPath);
  if (figureMatch) {
    const [, figureNumber, field] = figureMatch;
    return `Figure ${figureNumber} ${field === "alt" ? "alternative text" : "caption"}`;
  }
  return fieldPath;
};

const formatChangeProvenance = (
  provenance: ContentChange["provenance"]
): string =>
  ({
    generated: "Automated",
    manual: "Editor",
    normalized: "System cleanup",
  })[provenance];

const formatSourceName = (sourceUrl: string | undefined): string => {
  if (!sourceUrl) {
    return "Original website";
  }
  try {
    return new URL(sourceUrl).hostname.replace(WWW_PREFIX_PATTERN, "");
  } catch {
    return "Original website";
  }
};

const getSlug = (path: string): string =>
  path
    .replace(LEADING_SLASH_PATTERN, "")
    .replace(LITHUANIAN_PREFIX_PATTERN, "")
    .replace(TRAILING_SLASH_PATTERN, "");

const persistArticle = ({
  articleId,
  baseline,
  payload,
  sourceArticleId,
}: PersistArticleInput): Promise<Response> =>
  fetch(articleId ? `/api/articles/${articleId}` : "/api/articles", {
    body: JSON.stringify(
      articleId ? payload : { ...payload, baseline, sourceArticleId }
    ),
    headers: { "content-type": "application/json" },
    method: articleId ? "PUT" : "POST",
  });

// The page coordinates a complete article, conversion, preview, and revision workflow.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: keeping the workflow state colocated makes save and preview transitions explicit
export function ArticleEditor({
  article,
  onBack,
  onOpenTranslation,
  translations,
}: Props) {
  const [articleId, setArticleId] = useState<string | null>(null);
  const [baselineBody, setBaselineBody] = useState<JSONContent>(EMPTY_DOCUMENT);
  const [body, setBody] = useState<JSONContent>(EMPTY_DOCUMENT);
  const [changes, setChanges] = useState<ContentChange[]>([]);
  const [changesOpen, setChangesOpen] = useState(false);
  const [heroMediaId, setHeroMediaId] = useState<string | null>(null);
  const [language, setLanguage] = useState("lt");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<
    "saved" | "dirty" | "saving" | "error"
  >("saved");
  const [section, setSection] = useState(article.section);
  const [source, setSource] = useState<SourceArticle | null>(null);
  const [sourceReviewOpen, setSourceReviewOpen] = useState(false);
  const [status, setStatus] = useState<StoredArticle["status"]>("draft");
  const [summary, setSummary] = useState("");
  const [title, setTitle] = useState(article.title);
  const [translationGroupId, setTranslationGroupId] = useState(
    article.translationGroupId
  );
  const [translationKind, setTranslationKind] = useState(
    article.translationKind
  );
  const [translationReviewedAt, setTranslationReviewedAt] = useState<
    number | null
  >(null);
  const [translationReviewedBy, setTranslationReviewedBy] = useState<
    string | null
  >(null);
  const [translationReviewStatus, setTranslationReviewStatus] = useState(
    article.translationReviewStatus
  );
  const [translationSourceArticleId, setTranslationSourceArticleId] = useState<
    string | null
  >(null);
  const [translationSourceHash, setTranslationSourceHash] = useState<
    string | null
  >(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const loadArticle = async (): Promise<void> => {
      setLoadState("loading");
      try {
        const [storedResponse, baselineResponse] = await Promise.all([
          fetch(`/api/articles/${article.id}`, { signal: controller.signal }),
          fetch(`/api/articles/${article.id}/baseline`, {
            signal: controller.signal,
          }),
        ]);
        if (!(storedResponse.ok && baselineResponse.ok)) {
          throw new Error("Article request failed");
        }

        const { article: canonical } =
          (await storedResponse.json()) as ArticleResponse;
        const { baseline, changes: baselineChanges } =
          (await baselineResponse.json()) as BaselineResponse;
        const sourceRecord: SourceArticle = {
          ...article,
          capture: canonical.sourceCapture ?? article.capture,
          html: canonical.sourceHtml ?? "",
          labels: JSON.parse(canonical.labelsJson) as string[],
          section: canonical.section,
          source: canonical.sourceUrl ?? article.source,
        };

        setSource(sourceRecord);
        setBaselineBody(
          tiptapDocumentSchema.parse(JSON.parse(baseline.body_json))
        );
        setChanges(baselineChanges);
        setWarnings([]);
        setBody(
          resolveTiptapMediaUrls(
            tiptapDocumentSchema.parse(JSON.parse(canonical.bodyJson))
          )
        );
        setArticleId(canonical.id);
        setLanguage(canonical.language);
        setHeroMediaId(canonical.heroMediaId);
        setSection(canonical.section);
        setStatus(canonical.status);
        setSummary(canonical.summary);
        setTitle(canonical.title);
        setTranslationGroupId(canonical.translationGroupId);
        setTranslationKind(canonical.translationKind);
        setTranslationReviewedAt(canonical.translationReviewedAt);
        setTranslationReviewedBy(canonical.translationReviewedBy);
        setTranslationReviewStatus(canonical.translationReviewStatus);
        setTranslationSourceArticleId(canonical.translationSourceArticleId);
        setTranslationSourceHash(canonical.translationSourceHash);
        const revisionResponse = await fetch(
          `/api/articles/${canonical.id}/revisions`,
          { signal: controller.signal }
        );
        if (revisionResponse.ok) {
          const data = (await revisionResponse.json()) as {
            revisions: Revision[];
          };
          setRevisions(data.revisions);
        }
        setLoadState("ready");
        setSaveState("saved");
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setLoadState("error");
      }
    };

    loadArticle().catch(() => setLoadState("error"));
    return () => controller.abort();
  }, [article]);

  const updateBody = useCallback((nextBody: JSONContent) => {
    setBody(nextBody);
    setSaveState("dirty");
  }, []);
  const updateTitle = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(event.target.value);
    setSaveState("dirty");
  }, []);
  const updateSummary = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setSummary(event.target.value);
      setSaveState("dirty");
    },
    []
  );
  const updateLanguage = useCallback((value: string) => {
    setLanguage(value);
    setSaveState("dirty");
  }, []);
  const updateSection = useCallback((value: string) => {
    setSection(value);
    setSaveState("dirty");
  }, []);

  const loadRevisions = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/articles/${id}/revisions`);
    if (response.ok) {
      const data = (await response.json()) as { revisions: Revision[] };
      setRevisions(data.revisions);
    }
  }, []);

  const save = useCallback(
    async (
      nextStatus: StoredArticle["status"],
      reviewOverride?: {
        reviewedAt: number;
        reviewedBy: string;
        status: StoredArticle["translationReviewStatus"];
      }
    ): Promise<string | null> => {
      if (!title.trim()) {
        setSaveState("error");
        return null;
      }
      setSaveState("saving");
      const reviewMetadata = reviewOverride ?? {
        reviewedAt: translationReviewedAt,
        reviewedBy: translationReviewedBy,
        status: translationReviewStatus,
      };
      const payload = {
        body,
        heroSourceUrl: article.hero ?? undefined,
        kind: article.kind,
        labels: article.labels,
        language,
        publishedAt: article.published ? Date.parse(article.published) : null,
        section: section.trim(),
        slug: getSlug(article.path),
        status: nextStatus,
        summary,
        title,
        translationGroupId,
        translationKind,
        translationReviewedAt: reviewMetadata.reviewedAt,
        translationReviewedBy: reviewMetadata.reviewedBy ?? undefined,
        translationReviewStatus: reviewMetadata.status,
        translationSourceArticleId: translationSourceArticleId ?? undefined,
        translationSourceHash: translationSourceHash ?? undefined,
      };
      const response = await persistArticle({
        articleId,
        baseline: {
          body: baselineBody,
          converterVersion: "legacy-html-v1",
          summary: source?.description ?? "",
          title: source?.title ?? article.title,
        },
        payload,
        sourceArticleId: article.file,
      });
      if (!response.ok) {
        setSaveState("error");
        return null;
      }
      const result = (await response.json()) as {
        heroMediaId: string | null;
        id: string;
        version: number;
      };
      setArticleId(result.id);
      setHeroMediaId(result.heroMediaId);
      setStatus(nextStatus);
      if (reviewOverride) {
        setTranslationReviewedAt(reviewOverride.reviewedAt);
        setTranslationReviewedBy(reviewOverride.reviewedBy);
        setTranslationReviewStatus(reviewOverride.status);
      }
      setSaveState("saved");
      await loadRevisions(result.id);
      const changesResponse = await fetch(
        `/api/articles/${result.id}/baseline`
      );
      if (changesResponse.ok) {
        const data = (await changesResponse.json()) as BaselineResponse;
        setChanges(data.changes);
      }
      return result.id;
    },
    [
      article,
      articleId,
      baselineBody,
      body,
      language,
      loadRevisions,
      section,
      summary,
      source,
      title,
      translationGroupId,
      translationKind,
      translationReviewedAt,
      translationReviewedBy,
      translationReviewStatus,
      translationSourceArticleId,
      translationSourceHash,
    ]
  );
  const saveDraft = useCallback(() => {
    save("draft").catch(() => setSaveState("error"));
  }, [save]);
  const markEditorReviewed = useCallback(() => {
    save(status, {
      reviewedAt: Date.now(),
      reviewedBy: "studio-editor",
      status: "approved",
    }).catch(() => setSaveState("error"));
  }, [save, status]);
  const openTranslation = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const counterpart = translations.find(
        (candidate) => candidate.id === event.currentTarget.dataset.articleId
      );
      if (counterpart) {
        onOpenTranslation(counterpart);
      }
    },
    [onOpenTranslation, translations]
  );
  const openPreview = useCallback(() => setPreviewOpen(true), []);
  const closePreview = useCallback(() => setPreviewOpen(false), []);
  const openSourceReview = useCallback(() => {
    setSourceReviewOpen(true);
  }, []);
  const closeSourceReview = useCallback(() => setSourceReviewOpen(false), []);
  const openChanges = useCallback(() => setChangesOpen(true), []);
  const closeChanges = useCallback(() => setChangesOpen(false), []);

  useEffect(() => {
    if (!(changesOpen || previewOpen || sourceReviewOpen)) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setPreviewOpen(false);
        setSourceReviewOpen(false);
        setChangesOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [changesOpen, previewOpen, sourceReviewOpen]);

  const toggleHistory = useCallback(() => {
    setHistoryOpen((open) => !open);
  }, []);

  const restoreRevision = useCallback(
    async (version: number): Promise<void> => {
      if (!articleId) {
        return;
      }
      setRestoringVersion(version);
      const response = await fetch(
        `/api/articles/${articleId}/revisions/${version}/restore`,
        { method: "POST" }
      );
      if (response.ok) {
        const data = (await response.json()) as {
          article: StoredArticle;
        };
        setBody(
          resolveTiptapMediaUrls(
            tiptapDocumentSchema.parse(JSON.parse(data.article.bodyJson))
          )
        );
        setLanguage(data.article.language);
        setStatus(data.article.status);
        setSummary(data.article.summary);
        setTitle(data.article.title);
        setTranslationGroupId(data.article.translationGroupId);
        setTranslationKind(data.article.translationKind);
        setTranslationReviewedAt(data.article.translationReviewedAt);
        setTranslationReviewedBy(data.article.translationReviewedBy);
        setTranslationReviewStatus(data.article.translationReviewStatus);
        setTranslationSourceArticleId(data.article.translationSourceArticleId);
        setTranslationSourceHash(data.article.translationSourceHash);
        setSaveState("saved");
        await loadRevisions(articleId);
      }
      setRestoringVersion(null);
    },
    [articleId, loadRevisions]
  );
  const restoreRevisionFromButton = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const { version } = event.currentTarget.dataset;
      if (version) {
        restoreRevision(Number.parseInt(version, 10)).catch(() =>
          setRestoringVersion(null)
        );
      }
    },
    [restoreRevision]
  );

  const previewDocument = useMemo(() => {
    const parsedBody = tiptapDocumentSchema.safeParse(body);
    return parsedBody.success
      ? renderArticleDocument({
          body: parsedBody.data,
          hero: article.hero,
          language,
          summary,
          title,
        })
      : "";
  }, [article.hero, body, language, summary, title]);
  const qualityIssues = useMemo(
    () => getArticleQualityIssues({ body, summary, title }),
    [body, summary, title]
  );
  const bodyHasLeadFigure = useMemo(
    () =>
      body.content?.some(
        (node) => node.type === "figure" && node.attrs?.role === "lead"
      ) ?? false,
    [body]
  );

  const saveMessage = {
    dirty: "Unsaved changes",
    error: "Save failed — try again",
    saved: articleId ? "Saved to Studio" : "Source loaded",
    saving: "Saving…",
  }[saveState];

  return (
    <div className="review-editor-page">
      <header className="review-editor-topbar">
        <div className="review-editor-route">
          <button aria-label="Back to articles" onClick={onBack} type="button">
            <ArrowLeft />
          </button>
          <div>
            <strong>{title || "Untitled article"}</strong>
            <span>{saveMessage}</span>
          </div>
        </div>
        <div className="review-editor-actions">
          <Button onClick={openPreview} variant="outline">
            <Eye /> <span>Preview</span>
          </Button>
          <Button
            disabled={saveState === "saving"}
            onClick={saveDraft}
            variant="outline"
          >
            {saveState === "saving" ? (
              <LoaderCircle className="spin" />
            ) : (
              <Save />
            )}
            <span>Save draft</span>
          </Button>
        </div>
      </header>

      <nav aria-label="Article translations" className="review-translation-bar">
        <span>Translations</span>
        <div>
          {EDITION_LANGUAGES.map((editionLanguage) => {
            const counterpart = translations.find(
              (candidate) => candidate.language === editionLanguage
            );
            return counterpart ? (
              <button
                aria-current={
                  counterpart.id === article.id ? "page" : undefined
                }
                data-article-id={counterpart.id}
                key={editionLanguage}
                onClick={openTranslation}
                type="button"
              >
                <strong>{editionLanguage.toUpperCase()}</strong>
                <small>
                  {formatTranslationLabel(
                    counterpart.translationKind,
                    counterpart.translationReviewStatus
                  )}
                </small>
              </button>
            ) : (
              <span className="translation-missing" key={editionLanguage}>
                <strong>{editionLanguage.toUpperCase()}</strong>
                <small>Missing</small>
              </span>
            );
          })}
        </div>
      </nav>

      {loadState === "loading" ? (
        <div className="review-editor-state">
          <LoaderCircle className="spin" /> Loading article…
        </div>
      ) : null}
      {loadState === "error" ? (
        <div className="review-editor-state error">
          The article could not be loaded. Return to the inventory and try
          another record.
        </div>
      ) : null}

      {loadState === "ready" ? (
        <div className="review-editor-workspace">
          <main className="review-editor-document">
            <div className="review-article-fields">
              <label htmlFor="review-title">Title</label>
              <AutoResizeTextarea
                id="review-title"
                onChange={updateTitle}
                value={title}
              />
              <label htmlFor="review-summary">Summary</label>
              <textarea
                id="review-summary"
                maxLength={600}
                onChange={updateSummary}
                rows={3}
                value={summary}
              />
              <span className="review-field-count">{summary.length} / 600</span>
            </div>

            <section className="review-mobile-summary">
              <div>
                <span>Quality</span>
                <strong>
                  {qualityIssues.length === 0
                    ? "Checks passed"
                    : `${qualityIssues.length} issues`}
                </strong>
              </div>
              <div>
                <span>Current version</span>
                <strong>{revisions[0]?.version ?? "Unsaved"}</strong>
              </div>
              <div>
                <span>Language</span>
                <LanguageSelect onChange={updateLanguage} value={language} />
              </div>
              <Button onClick={openSourceReview} variant="outline">
                Compare source
              </Button>
              <Button
                disabled={changes.length === 0}
                onClick={openChanges}
                variant="outline"
              >
                {changes.length === 0
                  ? "No editorial changes"
                  : `Changes (${changes.length})`}
              </Button>
            </section>

            {bodyHasLeadFigure ? null : (
              <section className="review-hero-field">
                <div>
                  <strong>Lead image</strong>
                </div>
                {article.hero ? (
                  <img
                    alt={`Lead for ${title}`}
                    height="900"
                    src={
                      heroMediaId
                        ? `/api/media/${heroMediaId}`
                        : resolveRecoveredMediaUrl(article.hero)
                    }
                    width="1600"
                  />
                ) : (
                  <div className="review-empty-image">
                    <ImageIcon /> This article has no lead image
                  </div>
                )}
              </section>
            )}

            <section className="review-body-field">
              <div className="review-body-heading">
                <strong>Article body</strong>
                <span>Official Tiptap Simple Editor</span>
              </div>
              <SimpleEditor content={body} onUpdate={updateBody} />
            </section>
          </main>

          <aside className="review-inspector">
            <section>
              <h2>Workflow</h2>
              <dl>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <i /> {formatPublicationStatus(status)}
                  </dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{formatSourceName(source?.source)}</dd>
                </div>
                <div>
                  <dt>Translation</dt>
                  <dd>
                    <span className="translation-badge">
                      {formatTranslationLabel(
                        translationKind,
                        translationReviewStatus
                      )}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{revisions[0]?.version ?? "Unsaved"}</dd>
                </div>
              </dl>
              {revisions[0] ? (
                <p className="review-version-meta">
                  Saved {new Date(revisions[0].created_at).toLocaleString()} by{" "}
                  {revisions[0].editor_id}
                </p>
              ) : null}
              {translationKind !== "original" &&
              translationReviewStatus !== "approved" ? (
                <Button
                  disabled={saveState === "saving"}
                  onClick={markEditorReviewed}
                  variant="outline"
                >
                  <Check /> Mark editor reviewed
                </Button>
              ) : null}
              <button
                className="review-history-toggle"
                onClick={toggleHistory}
                type="button"
              >
                <History /> Revision history <ChevronDown />
              </button>
              {historyOpen ? (
                <ol className="review-history-list">
                  {revisions.map((revision, index) => {
                    const metadata = JSON.parse(revision.metadata_json) as {
                      title: string;
                    };
                    return (
                      <li key={revision.id}>
                        <div>
                          <strong>Version {revision.version}</strong>
                          <span>
                            {new Date(revision.created_at).toLocaleString()} ·{" "}
                            {revision.editor_id}
                          </span>
                          <small>{metadata.title}</small>
                        </div>
                        {index > 0 ? (
                          <button
                            data-version={revision.version}
                            disabled={restoringVersion !== null}
                            onClick={restoreRevisionFromButton}
                            type="button"
                          >
                            {restoringVersion === revision.version
                              ? "Restoring…"
                              : "Restore"}
                          </button>
                        ) : (
                          <em>Current</em>
                        )}
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </section>
            <section>
              <h2>Automatic quality checks</h2>
              <div
                className={`review-quality-status ${qualityIssues.length === 0 ? "passed" : "failed"}`}
              >
                {qualityIssues.length === 0 ? <Check /> : <X />}
                {qualityIssues.length === 0
                  ? "All checks passed"
                  : `${qualityIssues.length} issues found`}
              </div>
              {qualityIssues.length > 0 ? (
                <ul className="review-quality-issues">
                  {qualityIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
              <div className="review-inspector-actions">
                <Button onClick={openSourceReview} variant="outline">
                  Compare source
                </Button>
                <Button
                  disabled={changes.length === 0}
                  onClick={openChanges}
                  variant="outline"
                >
                  {changes.length === 0
                    ? "No editorial changes"
                    : `View ${changes.length} changes`}
                </Button>
              </div>
            </section>
            <section>
              <h2>Publication</h2>
              <label htmlFor="review-language">Language</label>
              <LanguageSelect
                id="review-language"
                onChange={updateLanguage}
                value={language}
              />
              <label htmlFor="review-section">Section</label>
              <SectionSelect
                id="review-section"
                language={language}
                onChange={updateSection}
                value={section}
              />
              <span className="review-inspector-label">Public path</span>
              <code>/{getSlug(article.path)}</code>
            </section>
          </aside>
        </div>
      ) : null}

      {previewOpen ? (
        <div
          aria-label="Article preview"
          aria-modal="true"
          className="review-overlay"
          role="dialog"
        >
          <div className="review-preview-window">
            <header>
              <div>
                <strong>Public article preview</strong>
                <span>
                  Canonical Tiptap JSON rendered through the shared renderer
                </span>
              </div>
              <button
                aria-label="Close preview"
                autoFocus
                onClick={closePreview}
                type="button"
              >
                <X />
              </button>
            </header>
            <iframe
              sandbox=""
              srcDoc={previewDocument}
              title="Article preview"
            />
          </div>
        </div>
      ) : null}

      {sourceReviewOpen ? (
        <div
          aria-label="Source comparison"
          aria-modal="true"
          className="review-overlay"
          role="dialog"
        >
          <div className="review-compare-window">
            <header>
              <div>
                <strong>Source comparison</strong>
                <span>Original page beside the current editor result</span>
              </div>
              <button
                aria-label="Close comparison"
                autoFocus
                onClick={closeSourceReview}
                type="button"
              >
                <X />
              </button>
            </header>
            <div className="review-compare-grid">
              <section>
                <h2>Original source</h2>
                <iframe
                  sandbox=""
                  srcDoc={source?.html ?? ""}
                  title="Original source"
                />
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
              <footer>
                <div className="review-warning-heading">
                  <strong>Source notes</strong>
                  <span>{warnings.length} issues detected</span>
                </div>
                <ol>
                  {warnings.map((warning, index) => (
                    <li key={warning} title={warning}>
                      <b>{index + 1}</b>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ol>
              </footer>
            ) : null}
          </div>
        </div>
      ) : null}

      {changesOpen ? (
        <div
          aria-label="Article changes"
          aria-modal="true"
          className="review-overlay"
          role="dialog"
        >
          <div className="review-compare-window">
            <header>
              <div>
                <strong>Editorial changes</strong>
                <span>Original source compared with the current article</span>
              </div>
              <button
                aria-label="Close changes"
                autoFocus
                onClick={closeChanges}
                type="button"
              >
                <X />
              </button>
            </header>
            {changes.length === 0 ? (
              <div className="review-editor-state">
                The current article matches its original source.
              </div>
            ) : (
              <ol className="review-change-list">
                {changes.map((change) => (
                  <li key={`${change.field_path}-${change.change_kind}`}>
                    <div>
                      <strong>{formatChangeField(change.field_path)}</strong>
                      <span>{change.change_kind}</span>
                      <span>{formatChangeProvenance(change.provenance)}</span>
                    </div>
                    <dl>
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
