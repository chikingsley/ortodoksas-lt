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
import { tiptapDocumentSchema } from "../../shared/content/article";
import {
  resolveRecoveredMediaUrl,
  resolveTiptapMediaUrls,
} from "../../shared/content/media-url";
import { getArticleQualityIssues } from "../../shared/editor/quality";
import { renderArticleDocument } from "../../shared/editor/render";

import { convertLegacyArticle } from "./convert-legacy-article";
import type { CatalogArticle, SourceArticle } from "./types";

interface Props {
  article: CatalogArticle;
  onBack: () => void;
}

interface StoredArticle {
  body_json: string;
  hero_media_id: string | null;
  id: string;
  language: string;
  slug: string;
  status: "draft" | "scheduled" | "published" | "archived";
  summary: string;
  title: string;
  translation_kind: "original" | "human" | "machine";
}

interface SourceResponse {
  article: StoredArticle | null;
}

interface Revision {
  created_at: number;
  editor_id: string;
  id: string;
  metadata_json: string;
  version: number;
}

const EMPTY_DOCUMENT: JSONContent = {
  content: [{ type: "paragraph" }],
  type: "doc",
};
const LEADING_SLASH_PATTERN = /^\/+/;
const LITHUANIAN_PREFIX_PATTERN = /^lt\//;
const TRAILING_SLASH_PATTERN = /\/$/;

const getSlug = (path: string): string =>
  path
    .replace(LEADING_SLASH_PATTERN, "")
    .replace(LITHUANIAN_PREFIX_PATTERN, "")
    .replace(TRAILING_SLASH_PATTERN, "");

// The page coordinates a complete article, conversion, preview, and revision workflow.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: keeping the workflow state colocated makes save and preview transitions explicit
export const ArticleEditor = ({ article, onBack }: Props) => {
  const [articleId, setArticleId] = useState<string | null>(null);
  const [baselineBody, setBaselineBody] = useState<JSONContent>(EMPTY_DOCUMENT);
  const [body, setBody] = useState<JSONContent>(EMPTY_DOCUMENT);
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
  const [source, setSource] = useState<SourceArticle | null>(null);
  const [sourceReviewOpen, setSourceReviewOpen] = useState(false);
  const [status, setStatus] = useState<StoredArticle["status"]>("draft");
  const [summary, setSummary] = useState("");
  const [title, setTitle] = useState(article.title);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: loading reconciles source conversion with an optional canonical record
    const loadArticle = async (): Promise<void> => {
      setLoadState("loading");
      try {
        const [sourceResponse, storedResponse] = await Promise.all([
          fetch(`/content/pages/${encodeURIComponent(article.file)}`, {
            signal: controller.signal,
          }),
          fetch(
            `/api/articles/source?key=${encodeURIComponent(article.file)}`,
            { signal: controller.signal }
          ),
        ]);
        if (!(sourceResponse.ok && storedResponse.ok)) {
          throw new Error("Article request failed");
        }

        const sourceRecord = (await sourceResponse.json()) as SourceArticle;
        const storedRecord = (await storedResponse.json()) as SourceResponse;
        const converted = convertLegacyArticle(
          sourceRecord.html,
          sourceRecord.hero
        );
        const canonical = storedRecord.article;

        setSource(sourceRecord);
        setBaselineBody(converted.body);
        setWarnings(converted.warnings);
        setBody(
          resolveTiptapMediaUrls(
            canonical
              ? tiptapDocumentSchema.parse(JSON.parse(canonical.body_json))
              : converted.body
          )
        );
        setArticleId(canonical?.id ?? null);
        setLanguage(canonical?.language ?? "lt");
        setHeroMediaId(canonical?.hero_media_id ?? null);
        setStatus(canonical?.status ?? "draft");
        setSummary(canonical?.summary ?? "");
        setTitle(canonical?.title ?? article.title);
        if (canonical) {
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
        } else {
          setRevisions([]);
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
  }, [article.file, article.title]);

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
  const updateLanguage = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setLanguage(event.target.value);
      setSaveState("dirty");
    },
    []
  );

  const loadRevisions = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/articles/${id}/revisions`);
    if (response.ok) {
      const data = (await response.json()) as { revisions: Revision[] };
      setRevisions(data.revisions);
    }
  }, []);

  const save = useCallback(
    async (nextStatus: StoredArticle["status"]): Promise<string | null> => {
      if (!title.trim()) {
        setSaveState("error");
        return null;
      }
      setSaveState("saving");
      const payload = {
        body,
        heroSourceUrl: article.hero ?? undefined,
        language,
        slug: getSlug(article.path),
        status: nextStatus,
        summary,
        title,
        translationKind: "original" as const,
      };
      const response = await fetch(
        articleId ? `/api/articles/${articleId}` : "/api/articles",
        {
          body: JSON.stringify(
            articleId
              ? payload
              : {
                  ...payload,
                  baseline: {
                    body: baselineBody,
                    converterVersion: "legacy-html-v1",
                    summary: source?.description ?? "",
                    title: source?.title ?? article.title,
                  },
                  sourceArticleId: article.file,
                }
          ),
          headers: { "content-type": "application/json" },
          method: articleId ? "PUT" : "POST",
        }
      );
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
      setSaveState("saved");
      await loadRevisions(result.id);
      return result.id;
    },
    [
      article.file,
      article.hero,
      article.path,
      article.title,
      articleId,
      baselineBody,
      body,
      language,
      loadRevisions,
      summary,
      source,
      title,
    ]
  );
  const saveDraft = useCallback(() => {
    save("draft").catch(() => setSaveState("error"));
  }, [save]);
  const openPreview = useCallback(() => setPreviewOpen(true), []);
  const closePreview = useCallback(() => setPreviewOpen(false), []);
  const openSourceReview = useCallback(() => {
    setSourceReviewOpen(true);
  }, []);
  const closeSourceReview = useCallback(() => setSourceReviewOpen(false), []);

  useEffect(() => {
    if (!(previewOpen || sourceReviewOpen)) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setPreviewOpen(false);
        setSourceReviewOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [previewOpen, sourceReviewOpen]);

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
            tiptapDocumentSchema.parse(JSON.parse(data.article.body_json))
          )
        );
        setLanguage(data.article.language);
        setStatus(data.article.status);
        setSummary(data.article.summary);
        setTitle(data.article.title);
        setSaveState("saved");
        await loadRevisions(articleId);
      }
      setRestoringVersion(null);
    },
    [articleId, loadRevisions]
  );
  const restoreRevisionFromButton = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const version = Number.parseInt(
        event.currentTarget.dataset.version ?? "",
        10
      );
      if (Number.isFinite(version)) {
        restoreRevision(version).catch(() => setRestoringVersion(null));
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
    saved: articleId ? "Saved to Studio" : "Archive source loaded",
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

      {loadState === "loading" ? (
        <div className="review-editor-state">
          <LoaderCircle className="spin" /> Converting the archived article…
        </div>
      ) : null}
      {loadState === "error" ? (
        <div className="review-editor-state error">
          The archived article could not be loaded. Return to the inventory and
          try another record.
        </div>
      ) : null}

      {loadState === "ready" ? (
        <div className="review-editor-workspace">
          <main className="review-editor-document">
            <div className="review-article-fields">
              <label htmlFor="review-title">Title</label>
              <textarea
                id="review-title"
                onChange={updateTitle}
                rows={2}
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
                <select
                  aria-label="Article language"
                  onChange={updateLanguage}
                  value={language}
                >
                  <option value="lt">Lithuanian</option>
                  <option value="en">English</option>
                  <option value="ru">Russian</option>
                  <option value="uk">Ukrainian</option>
                  <option value="be">Belarusian</option>
                </select>
              </div>
              <Button onClick={openSourceReview} variant="outline">
                Compare conversion
              </Button>
            </section>

            {bodyHasLeadFigure ? null : (
              <section className="review-hero-field">
                <div>
                  <strong>Lead image</strong>
                  <span>Recovered archive image</span>
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
                    <i /> {status.replace("_", " ")}
                  </dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>Recovered archive</dd>
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
              <Button onClick={openSourceReview} variant="outline">
                Compare source and result
              </Button>
            </section>
            <section>
              <h2>Publication</h2>
              <label htmlFor="review-language">Language</label>
              <select
                id="review-language"
                onChange={updateLanguage}
                value={language}
              >
                <option value="lt">Lithuanian</option>
                <option value="en">English</option>
                <option value="ru">Russian</option>
                <option value="uk">Ukrainian</option>
                <option value="be">Belarusian</option>
              </select>
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
          aria-label="Conversion comparison"
          aria-modal="true"
          className="review-overlay"
          role="dialog"
        >
          <div className="review-compare-window">
            <header>
              <div>
                <strong>Conversion comparison</strong>
                <span>Archived HTML beside the canonical editor result</span>
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
                <h2>Archived source</h2>
                <iframe
                  sandbox=""
                  srcDoc={source?.html ?? ""}
                  title="Archived source"
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
                  <strong>Import warnings</strong>
                  <span>{warnings.length} source issues detected</span>
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
    </div>
  );
};
