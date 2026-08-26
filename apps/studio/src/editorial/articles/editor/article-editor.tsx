import {
  articleBylineUrlSchema,
  tiptapDocumentSchema,
} from "@ortodoksas-lt/content/article";
import { getArticleQualityIssues } from "@ortodoksas-lt/editor/quality";
import { renderArticleDocument } from "@ortodoksas-lt/editor/render";
import { useForm, useStore } from "@tanstack/react-form";
import { useBlocker } from "@tanstack/react-router";
import type { JSONContent } from "@tiptap/core";
import { LoaderCircle } from "lucide-react";
import {
  type ChangeEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { StudioDialog } from "@/editorial/shared/studio-dialog";
import type { CatalogArticle } from "../types";
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

interface Props {
  article: CatalogArticle;
  onBack: () => void;
  onCreateTranslation: (
    source: CatalogArticle,
    language: "en" | "ru" | "uk" | "be"
  ) => Promise<void>;
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
const editorialMetadataSchema = z.object({
  byline: z.string().trim().max(200),
  bylineType: z.enum(["person", "organization"]),
  bylineUrl: articleBylineUrlSchema,
  language: z.string().trim().min(2).max(16),
  section: z.string().trim().max(160),
  seoDescription: z.string().trim().max(600),
  seoTitle: z.string().trim().max(240),
  summary: z.string().trim().max(600),
  title: z.string().trim().min(1).max(240),
});
type EditorialMetadata = z.infer<typeof editorialMetadataSchema>;
type TranslationReviewAction = "approve" | "mark_pending" | "request_changes";
interface ArticleSubmitMeta {
  nextStatus: StoredArticle["status"];
  translationReviewAction?: TranslationReviewAction;
}

const getSlug = (path: string): string =>
  path
    .replace(LEADING_SLASH_PATTERN, "")
    .replace(LITHUANIAN_PREFIX_PATTERN, "")
    .replace(TRAILING_SLASH_PATTERN, "");

export function ArticleEditor({
  article,
  onBack,
  onCreateTranslation,
  onOpenTranslation,
  translations,
}: Props) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "saved" | "dirty" | "saving" | "error"
  >("saved");
  const submittedArticleId = useRef<string | null>(null);
  const persistValidatedArticle = useRef<
    (values: EditorialMetadata, meta: ArticleSubmitMeta) => Promise<string>
  >(() =>
    Promise.reject(new Error("Article persistence is still initializing"))
  );
  const [metadataDefaults, setMetadataDefaults] = useState<EditorialMetadata>(
    () => ({
      byline: "",
      bylineType: "person",
      bylineUrl: "",
      language: "lt",
      section: article.section,
      seoDescription: "",
      seoTitle: "",
      summary: "",
      title: article.title,
    })
  );
  const metadataForm = useForm({
    defaultValues: metadataDefaults,
    onSubmit: async ({ meta, value }) => {
      submittedArticleId.current = await persistValidatedArticle.current(
        value,
        meta
      );
    },
    onSubmitInvalid: () => {
      submittedArticleId.current = null;
      setSaveError("Complete the required metadata fields before saving.");
      setSaveState("error");
    },
    onSubmitMeta: { nextStatus: "draft" } as ArticleSubmitMeta,
    validators: {
      onChange: editorialMetadataSchema,
      onSubmit: editorialMetadataSchema,
    },
  });
  const metadata = useStore(metadataForm.store, (state) => state.values);
  const {
    byline,
    bylineType,
    bylineUrl,
    language,
    section,
    seoDescription,
    seoTitle,
    summary,
    title,
  } = metadata;
  const [articleId, setArticleId] = useState<string | null>(null);
  const [baselineBody, setBaselineBody] = useState<JSONContent>(EMPTY_DOCUMENT);
  const [body, setBody] = useState<JSONContent>(EMPTY_DOCUMENT);
  const [changes, setChanges] = useState<ContentChange[]>([]);
  const [changesOpen, setChangesOpen] = useState(false);
  const [heroMediaId, setHeroMediaId] = useState<string | null>(null);
  const [heroFit, setHeroFit] = useState<"contain" | "cover">("cover");
  const [heroFocalX, setHeroFocalX] = useState(50);
  const [heroFocalY, setHeroFocalY] = useState(50);
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
  const [status, setStatus] = useState<StoredArticle["status"]>("draft");
  const [translationGroupId, setTranslationGroupId] = useState(
    article.translationGroupId
  );
  const [translationKind, setTranslationKind] = useState(
    article.translationKind
  );
  const [translationReviewStatus, setTranslationReviewStatus] = useState(
    article.translationReviewStatus
  );
  const [translationSourceQuality, setTranslationSourceQuality] = useState<{
    body: JSONContent;
    language: string;
    summary: string;
    title: string;
  } | null>(null);
  const [translationSourceCurrentHash, setTranslationSourceCurrentHash] =
    useState<string | null>(null);
  const hasUnsavedChanges = saveState !== "saved";
  const navigationBlocker = useBlocker({
    disabled: !hasUnsavedChanges,
    enableBeforeUnload: hasUnsavedChanges,
    shouldBlockFn: () => hasUnsavedChanges,
    withResolver: true,
  });
  const handleDiscardDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open && navigationBlocker.status === "blocked") {
        navigationBlocker.reset();
      }
    },
    [navigationBlocker]
  );
  const discardAndLeave = useCallback(() => {
    if (navigationBlocker.status === "blocked") {
      navigationBlocker.proceed();
    }
  }, [navigationBlocker]);
  const keepEditing = useCallback(() => {
    if (navigationBlocker.status === "blocked") {
      navigationBlocker.reset();
    }
  }, [navigationBlocker]);

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
          translationSourceCurrentHash: loadedTranslationSourceHash,
        } = await fetchArticleWorkspace(article.id, controller.signal);
        setBaselineBody(
          tiptapDocumentSchema.parse(JSON.parse(baseline.body_json))
        );
        setChanges(baselineChanges);
        setBody(tiptapDocumentSchema.parse(JSON.parse(canonical.bodyJson)));
        setArticleId(canonical.id);
        const loadedMetadata = {
          byline: canonical.byline ?? "",
          bylineType: canonical.bylineType,
          bylineUrl: canonical.bylineUrl ?? "",
          language: canonical.language,
          section: canonical.section,
          seoDescription: canonical.seoDescription ?? "",
          seoTitle: canonical.seoTitle ?? "",
          summary: canonical.summary,
          title: canonical.title,
        } satisfies EditorialMetadata;
        setMetadataDefaults(loadedMetadata);
        metadataForm.reset(loadedMetadata);
        setPublishedAt(canonical.publishedAt);
        setHeroMediaId(canonical.heroMediaId);
        setHeroFit(canonical.heroFit);
        setHeroFocalX(canonical.heroFocalX);
        setHeroFocalY(canonical.heroFocalY);
        setStatus(canonical.status);
        setTranslationGroupId(canonical.translationGroupId);
        setTranslationKind(canonical.translationKind);
        setTranslationReviewStatus(canonical.translationReviewStatus);
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
        setTranslationSourceCurrentHash(loadedTranslationSourceHash);
        setRevisions(loadedRevisions);
        setLoadState("ready");
        setSaveError(null);
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
  }, [article, metadataForm]);

  const updateBody = useCallback((nextBody: JSONContent) => {
    setBody(nextBody);
    setSaveState("dirty");
  }, []);
  const updateTitle = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      metadataForm.setFieldValue("title", event.target.value);
      setSaveState("dirty");
    },
    [metadataForm]
  );
  const updateSummary = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      metadataForm.setFieldValue("summary", event.target.value);
      setSaveState("dirty");
    },
    [metadataForm]
  );
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
  const updateSection = useCallback(
    (value: string) => {
      metadataForm.setFieldValue("section", value);
      setSaveState("dirty");
    },
    [metadataForm]
  );
  const updateByline = useCallback(
    (value: string) => {
      metadataForm.setFieldValue("byline", value);
      setSaveState("dirty");
    },
    [metadataForm]
  );
  const updateBylineType = useCallback(
    (value: "organization" | "person") => {
      metadataForm.setFieldValue("bylineType", value);
      setSaveState("dirty");
    },
    [metadataForm]
  );
  const updateBylineUrl = useCallback(
    (value: string) => {
      metadataForm.setFieldValue("bylineUrl", value);
      setSaveState("dirty");
    },
    [metadataForm]
  );
  const updateSeoDescription = useCallback(
    (value: string) => {
      metadataForm.setFieldValue("seoDescription", value);
      setSaveState("dirty");
    },
    [metadataForm]
  );
  const updateSeoTitle = useCallback(
    (value: string) => {
      metadataForm.setFieldValue("seoTitle", value);
      setSaveState("dirty");
    },
    [metadataForm]
  );

  const loadRevisions = useCallback(async (id: string): Promise<void> => {
    setRevisions(await fetchArticleRevisions(id));
  }, []);

  const saveValidatedArticle = useCallback(
    async (
      values: EditorialMetadata,
      submitMeta: ArticleSubmitMeta
    ): Promise<string> => {
      setSaveError(null);
      setSaveState("saving");
      const payload = {
        body,
        byline: values.byline,
        bylineType: values.bylineType,
        bylineUrl: values.bylineUrl,
        expectedVersion: Math.max(
          0,
          ...revisions.map((revision) => revision.version)
        ),
        ...(submitMeta.translationReviewAction === "approve" &&
        translationSourceCurrentHash
          ? { expectedTranslationSourceHash: translationSourceCurrentHash }
          : {}),
        heroFit,
        heroFocalX,
        heroFocalY,
        heroSourceUrl: article.hero ?? undefined,
        kind: article.kind,
        labels: article.labels,
        language: values.language,
        publishedAt,
        section: values.section.trim(),
        seoDescription: values.seoDescription,
        seoTitle: values.seoTitle,
        slug: getSlug(article.path),
        status: submitMeta.nextStatus,
        summary: values.summary,
        title: values.title,
        translationGroupId,
        translationKind,
        ...(submitMeta.translationReviewAction
          ? { translationReviewAction: submitMeta.translationReviewAction }
          : {}),
      };
      const response = await persistArticle({
        articleId,
        baseline: {
          body: baselineBody,
          converterVersion: "native-v1",
          summary: article.description,
          title: article.title,
        },
        payload,
      });
      if (!response.ok) {
        setSaveError(response.issues?.[0] ?? response.error);
        setSaveState("error");
        throw new Error(response.error);
      }
      const result = response.data;
      setArticleId(result.id);
      setHeroMediaId(result.heroMediaId);
      setPublishedAt(result.publishedAt);
      setStatus(submitMeta.nextStatus);
      setTranslationReviewStatus(
        result.translationReviewStatus as StoredArticle["translationReviewStatus"]
      );
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
      loadRevisions,
      publishedAt,
      revisions,
      translationGroupId,
      translationKind,
      translationSourceCurrentHash,
    ]
  );
  persistValidatedArticle.current = saveValidatedArticle;

  const submitArticle = useCallback(
    async (
      nextStatus: StoredArticle["status"],
      translationReviewAction?: TranslationReviewAction
    ): Promise<string | null> => {
      submittedArticleId.current = null;
      try {
        await metadataForm.handleSubmit({
          nextStatus,
          ...(translationReviewAction ? { translationReviewAction } : {}),
        });
      } catch {
        setSaveError(
          (currentError) =>
            currentError ?? "Studio could not save this article."
        );
        setSaveState("error");
      }
      return submittedArticleId.current;
    },
    [metadataForm]
  );
  const saveCurrentStatus = useCallback(() => {
    submitArticle(status).catch(() => setSaveState("error"));
  }, [status, submitArticle]);
  const markEditorReviewed = useCallback(() => {
    submitArticle(status, "approve").catch(() => setSaveState("error"));
  }, [status, submitArticle]);
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
  const createTranslation = useCallback(
    (targetLanguage: "en" | "ru" | "uk" | "be") =>
      onCreateTranslation(article, targetLanguage),
    [article, onCreateTranslation]
  );
  const openPreview = useCallback(() => setPreviewOpen(true), []);
  const openPublication = useCallback(() => {
    setPublicationError(null);
    setPublicationState("idle");
    setPublicationVerification(null);
    setPublicationOpen(true);
  }, []);
  const openChanges = useCallback(() => setChangesOpen(true), []);

  const publishOrVerify = useCallback(async (): Promise<void> => {
    setPublicationError(null);
    setPublicationState("working");
    const publishingChanges = status !== "published" || saveState === "dirty";
    const publishedId = publishingChanges
      ? await submitArticle("published")
      : articleId;
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
  }, [articleId, saveState, status, submitArticle]);
  const runPublication = useCallback(() => {
    publishOrVerify().catch(() => {
      setPublicationError(
        "Publication encountered a service error. The saved article remains available in Studio."
      );
      setPublicationState("error");
    });
  }, [publishOrVerify]);

  const restoreRevision = useCallback(
    async (version: number): Promise<void> => {
      if (!articleId) {
        return;
      }
      setRestoringVersion(version);
      const restoredArticle = await restoreArticleRevision(
        articleId,
        version,
        Math.max(0, ...revisions.map((revision) => revision.version))
      );
      if (restoredArticle) {
        setBody(
          tiptapDocumentSchema.parse(JSON.parse(restoredArticle.bodyJson))
        );
        setHeroFit(restoredArticle.heroFit);
        setHeroFocalX(restoredArticle.heroFocalX);
        setHeroFocalY(restoredArticle.heroFocalY);
        const restoredMetadata = {
          byline: restoredArticle.byline ?? "",
          bylineType: restoredArticle.bylineType,
          bylineUrl: restoredArticle.bylineUrl ?? "",
          language: restoredArticle.language,
          section: restoredArticle.section,
          seoDescription: restoredArticle.seoDescription ?? "",
          seoTitle: restoredArticle.seoTitle ?? "",
          summary: restoredArticle.summary,
          title: restoredArticle.title,
        } satisfies EditorialMetadata;
        setMetadataDefaults(restoredMetadata);
        metadataForm.reset(restoredMetadata);
        setStatus(restoredArticle.status);
        setTranslationGroupId(restoredArticle.translationGroupId);
        setTranslationKind(restoredArticle.translationKind);
        setTranslationReviewStatus(restoredArticle.translationReviewStatus);
        setSaveState("saved");
        await loadRevisions(articleId);
      }
      setRestoringVersion(null);
    },
    [articleId, loadRevisions, metadataForm, revisions]
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
        onCreateTranslation={createTranslation}
        onOpenTranslation={openTranslation}
        onPreview={openPreview}
        onPublish={openPublication}
        onSave={saveCurrentStatus}
        saveError={saveError}
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
            summary={summary}
            title={title}
          />

          <ArticleEditorInspector
            byline={byline}
            bylineType={bylineType}
            bylineUrl={bylineUrl}
            changesCount={changes.length}
            hasLeadImage={Boolean(heroMediaId || article.hero)}
            heroFit={heroFit}
            heroFocalX={heroFocalX}
            heroFocalY={heroFocalY}
            historyOpen={historyOpen}
            language={language}
            onBylineChange={updateByline}
            onBylineTypeChange={updateBylineType}
            onBylineUrlChange={updateBylineUrl}
            onHeroFitChange={updateHeroFit}
            onHeroFocalXChange={updateHeroFocalX}
            onHeroFocalYChange={updateHeroFocalY}
            onHistoryOpenChange={setHistoryOpen}
            onMarkReviewed={markEditorReviewed}
            onOpenChanges={openChanges}
            onRestoreRevision={restoreRevisionFromButton}
            onSectionChange={updateSection}
            onSeoDescriptionChange={updateSeoDescription}
            onSeoTitleChange={updateSeoTitle}
            publicPath={`${language === "lt" ? "" : `${language}/`}${getSlug(article.path)}`}
            qualityIssues={qualityIssues}
            restoringVersion={restoringVersion}
            revisions={revisions}
            saveState={saveState}
            section={section}
            seoDescription={seoDescription}
            seoTitle={seoTitle}
            status={status}
            summary={summary}
            title={title}
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
        previewDocument={previewDocument}
        previewOpen={previewOpen}
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
      <StudioDialog
        description="This article contains changes that are waiting to be saved."
        onOpenChange={handleDiscardDialogOpenChange}
        open={navigationBlocker.status === "blocked"}
        popupClassName="h-auto w-[min(440px,100%)] grid-rows-[auto_auto]"
        title="Leave this article?"
      >
        <div className="grid gap-5 p-5">
          <p className="m-0 text-muted-foreground text-sm leading-6">
            Leaving now discards the current editing session. The latest saved
            revision stays available in Studio.
          </p>
          <div className="flex justify-end gap-2">
            <Button onClick={keepEditing} type="button" variant="outline">
              Keep editing
            </Button>
            <Button
              onClick={discardAndLeave}
              type="button"
              variant="destructive"
            >
              Discard and leave
            </Button>
          </div>
        </div>
      </StudioDialog>
    </div>
  );
}
