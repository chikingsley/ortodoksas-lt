import { tiptapDocumentSchema } from "@ortodoksas-lt/content/article";
import {
  resolveRecoveredMediaUrl,
  resolveTiptapMediaUrls,
} from "@ortodoksas-lt/content/media-url";
import { getArticleQualityIssues } from "@ortodoksas-lt/editor/quality";
import { renderArticleDocument } from "@ortodoksas-lt/editor/render";
import type { JSONContent } from "@tiptap/core";
import { LoaderCircle } from "lucide-react";
import {
  type ChangeEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchArticleBaseline,
  fetchArticleRevisions,
  fetchArticleWorkspace,
  persistArticle,
  restoreArticleRevision,
  verifyArticlePublication,
} from "./article-editor-api";
import { ArticleEditorDialogs } from "./article-editor-dialogs";
import { ArticleEditorDocument } from "./article-editor-document";
import { ArticleEditorHeader } from "./article-editor-header";
import { ArticleEditorInspector } from "./article-editor-inspector";
import type {
  ContentChange,
  PublicationVerification,
  Revision,
  StoredArticle,
} from "./article-editor-types";
import { ArticlePublicationDialog } from "./article-publication-dialog";
import type { CatalogArticle, SourceArticle } from "./types";

interface Props {
  article: CatalogArticle;
  onBack: () => void;
  onOpenTranslation: (article: CatalogArticle) => void;
  translations: CatalogArticle[];
}

const EMPTY_DOCUMENT: JSONContent = {
  content: [{ type: "paragraph" }],
  type: "doc",
};
const LEADING_SLASH_PATTERN = /^\/+/;
const LITHUANIAN_PREFIX_PATTERN = /^lt\//;
const TRAILING_SLASH_PATTERN = /\/$/;
const WWW_PREFIX_PATTERN = /^www\./u;

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
  const [heroFit, setHeroFit] = useState<"contain" | "cover">("cover");
  const [heroFocalX, setHeroFocalX] = useState(50);
  const [heroFocalY, setHeroFocalY] = useState(50);
  const [language, setLanguage] = useState("lt");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publicationError, setPublicationError] = useState<string | null>(null);
  const [publicationOpen, setPublicationOpen] = useState(false);
  const [publicationState, setPublicationState] = useState<
    "error" | "idle" | "published_unverified" | "verified" | "working"
  >("idle");
  const [publicationVerification, setPublicationVerification] =
    useState<PublicationVerification | null>(null);
  const [publishedAt, setPublishedAt] = useState<number | null>(null);
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
  const [translationSourceQuality, setTranslationSourceQuality] = useState<{
    body: JSONContent;
    language: string;
    summary: string;
    title: string;
  } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const loadArticle = async (): Promise<void> => {
      setLoadState("loading");
      try {
        const {
          baseline,
          canonical,
          changes: baselineChanges,
          revisions: loadedRevisions,
          translationSource,
        } = await fetchArticleWorkspace(article.id, controller.signal);
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
        setPublishedAt(canonical.publishedAt);
        setHeroMediaId(canonical.heroMediaId);
        setHeroFit(canonical.heroFit);
        setHeroFocalX(canonical.heroFocalX);
        setHeroFocalY(canonical.heroFocalY);
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
        setTranslationSourceQuality(
          translationSource
            ? {
                body: tiptapDocumentSchema.parse(
                  JSON.parse(translationSource.bodyJson)
                ),
                language: translationSource.language,
                summary: translationSource.summary,
                title: translationSource.title,
              }
            : null
        );
        setRevisions(loadedRevisions);
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
  const updateHeroFit = useCallback((value: "contain" | "cover") => {
    setHeroFit(value);
    setSaveState("dirty");
  }, []);
  const updateHeroFocalX = useCallback((value: number) => {
    setHeroFocalX(value);
    setSaveState("dirty");
  }, []);
  const updateHeroFocalY = useCallback((value: number) => {
    setHeroFocalY(value);
    setSaveState("dirty");
  }, []);
  const updateSection = useCallback((value: string) => {
    setSection(value);
    setSaveState("dirty");
  }, []);

  const loadRevisions = useCallback(async (id: string): Promise<void> => {
    setRevisions(await fetchArticleRevisions(id));
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
        heroFit,
        heroFocalX,
        heroFocalY,
        heroSourceUrl: article.hero ?? undefined,
        kind: article.kind,
        labels: article.labels,
        language,
        publishedAt,
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
        publishedAt: number | null;
        version: number;
      };
      setArticleId(result.id);
      setHeroMediaId(result.heroMediaId);
      setPublishedAt(result.publishedAt);
      setStatus(nextStatus);
      if (reviewOverride) {
        setTranslationReviewedAt(reviewOverride.reviewedAt);
        setTranslationReviewedBy(reviewOverride.reviewedBy);
        setTranslationReviewStatus(reviewOverride.status);
      }
      setSaveState("saved");
      await loadRevisions(result.id);
      const updatedBaseline = await fetchArticleBaseline(result.id);
      if (updatedBaseline) {
        setChanges(updatedBaseline.changes);
      }
      return result.id;
    },
    [
      article,
      articleId,
      baselineBody,
      body,
      heroFit,
      heroFocalX,
      heroFocalY,
      language,
      loadRevisions,
      publishedAt,
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
  const saveCurrentStatus = useCallback(() => {
    save(status).catch(() => setSaveState("error"));
  }, [save, status]);
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
  const openPublication = useCallback(() => {
    setPublicationError(null);
    setPublicationState("idle");
    setPublicationVerification(null);
    setPublicationOpen(true);
  }, []);
  const openSourceReview = useCallback(() => {
    setSourceReviewOpen(true);
  }, []);
  const openChanges = useCallback(() => setChangesOpen(true), []);

  const publishOrVerify = useCallback(async (): Promise<void> => {
    setPublicationError(null);
    setPublicationState("working");
    const publishingChanges = status !== "published" || saveState === "dirty";
    const publishedId = publishingChanges ? await save("published") : articleId;
    if (!publishedId) {
      setPublicationError(
        "Publication stopped at the server quality gate. Resolve the listed findings and try again."
      );
      setPublicationState("error");
      return;
    }
    const verification = await verifyArticlePublication(publishedId);
    if (!verification) {
      setPublicationError(
        "The article is published. Live verification is ready for another check."
      );
      setPublicationState("error");
      return;
    }
    setPublicationVerification(verification);
    setPublicationState(
      verification.reachable ? "verified" : "published_unverified"
    );
  }, [articleId, save, saveState, status]);
  const runPublication = useCallback(() => {
    publishOrVerify().catch(() => {
      setPublicationError(
        "Publication encountered a service error. The saved article remains available in Studio."
      );
      setPublicationState("error");
    });
  }, [publishOrVerify]);

  const toggleHistory = useCallback(() => {
    setHistoryOpen((open) => !open);
  }, []);

  const restoreRevision = useCallback(
    async (version: number): Promise<void> => {
      if (!articleId) {
        return;
      }
      setRestoringVersion(version);
      const restoredArticle = await restoreArticleRevision(articleId, version);
      if (restoredArticle) {
        setBody(
          resolveTiptapMediaUrls(
            tiptapDocumentSchema.parse(JSON.parse(restoredArticle.bodyJson))
          )
        );
        setHeroFit(restoredArticle.heroFit);
        setHeroFocalX(restoredArticle.heroFocalX);
        setHeroFocalY(restoredArticle.heroFocalY);
        setLanguage(restoredArticle.language);
        setStatus(restoredArticle.status);
        setSummary(restoredArticle.summary);
        setTitle(restoredArticle.title);
        setTranslationGroupId(restoredArticle.translationGroupId);
        setTranslationKind(restoredArticle.translationKind);
        setTranslationReviewedAt(restoredArticle.translationReviewedAt);
        setTranslationReviewedBy(restoredArticle.translationReviewedBy);
        setTranslationReviewStatus(restoredArticle.translationReviewStatus);
        setTranslationSourceArticleId(
          restoredArticle.translationSourceArticleId
        );
        setTranslationSourceHash(restoredArticle.translationSourceHash);
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
    () =>
      getArticleQualityIssues({
        body,
        language,
        summary,
        title,
        translationSource: translationSourceQuality ?? undefined,
      }),
    [body, language, summary, title, translationSourceQuality]
  );
  const bodyHasLeadFigure = useMemo(
    () =>
      body.content?.some(
        (node) => node.type === "figure" && node.attrs?.role === "lead"
      ) ?? false,
    [body]
  );

  return (
    <div className="min-h-screen bg-muted/60">
      <ArticleEditorHeader
        articleId={articleId}
        onBack={onBack}
        onOpenTranslation={openTranslation}
        onPreview={openPreview}
        onPublish={openPublication}
        onSave={saveCurrentStatus}
        saveState={saveState}
        status={status}
        title={title}
        translations={translations}
      />

      {loadState === "loading" ? (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center gap-2.5 text-muted-foreground text-sm [&_svg]:w-[18px]">
          <LoaderCircle className="animate-spin" /> Loading article…
        </div>
      ) : null}
      {loadState === "error" ? (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center gap-2.5 text-destructive text-sm">
          The article could not be loaded. Return to the inventory and try
          another record.
        </div>
      ) : null}

      {loadState === "ready" ? (
        <div className="mx-auto grid max-w-[1320px] grid-cols-[minmax(0,1fr)_304px] border-x bg-card max-editor-mobile:block max-editor-compact:grid-cols-[minmax(0,1fr)_280px] max-editor-compact:border-l-0">
          <ArticleEditorDocument
            body={body}
            bodyHasLeadFigure={bodyHasLeadFigure}
            heroFit={heroFit}
            heroFocalX={heroFocalX}
            heroFocalY={heroFocalY}
            heroMediaId={heroMediaId}
            heroUrl={article.hero}
            onBodyChange={updateBody}
            onSummaryChange={updateSummary}
            onTitleChange={updateTitle}
            resolveHeroUrl={resolveRecoveredMediaUrl}
            summary={summary}
            title={title}
          />

          <ArticleEditorInspector
            changesCount={changes.length}
            heroFit={heroFit}
            heroFocalX={heroFocalX}
            heroFocalY={heroFocalY}
            historyOpen={historyOpen}
            language={language}
            onHeroFitChange={updateHeroFit}
            onHeroFocalXChange={updateHeroFocalX}
            onHeroFocalYChange={updateHeroFocalY}
            onLanguageChange={updateLanguage}
            onMarkReviewed={markEditorReviewed}
            onOpenChanges={openChanges}
            onOpenSource={openSourceReview}
            onRestoreRevision={restoreRevisionFromButton}
            onSectionChange={updateSection}
            onToggleHistory={toggleHistory}
            publicPath={getSlug(article.path)}
            qualityIssues={qualityIssues}
            restoringVersion={restoringVersion}
            revisions={revisions}
            saveState={saveState}
            section={section}
            sourceName={formatSourceName(source?.source)}
            status={status}
            translationKind={translationKind}
            translationReviewStatus={translationReviewStatus}
          />
        </div>
      ) : null}

      <ArticleEditorDialogs
        changes={changes}
        changesOpen={changesOpen}
        onChangesOpenChange={setChangesOpen}
        onPreviewOpenChange={setPreviewOpen}
        onSourceOpenChange={setSourceReviewOpen}
        previewDocument={previewDocument}
        previewOpen={previewOpen}
        sourceHtml={source?.html ?? ""}
        sourceOpen={sourceReviewOpen}
        warnings={warnings}
      />
      <ArticlePublicationDialog
        errorMessage={publicationError}
        onAction={runPublication}
        onOpenChange={setPublicationOpen}
        open={publicationOpen}
        publicationState={publicationState}
        publishingChanges={status !== "published" || saveState === "dirty"}
        qualityIssues={qualityIssues}
        title={title}
        verification={publicationVerification}
      />
    </div>
  );
}
