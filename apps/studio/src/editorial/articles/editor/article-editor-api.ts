import {
  createInteractiveArticleSchema,
  updateArticleSchema,
} from "@ortodoksas-lt/content/article";
import { hasText } from "@ortodoksas-lt/content/value";
import { queryOptions } from "@tanstack/react-query";

import type { StudioOperationResult } from "@/server/articles/article-operation-support.server";
import {
  createArticleMutation,
  deleteArticleDraftMutation,
  loadArticleBaseline,
  loadArticleRevisions,
  loadArticleWorkspace,
  restoreArticleRevisionMutation,
  updateArticleMutation,
  verifyArticlePublicationQuery,
} from "@/server/articles/article.functions";
import type { PersistedArticle } from "@/shared/article-contract";
import { storedArticleSchema } from "@/shared/article-contract";

import type {
  BaselineResponse,
  PersistArticleInput,
  PublicationVerification,
  Revision,
  StoredArticle,
} from "./article-editor-types";

export interface ArticleWorkspaceResponse {
  baseline: BaselineResponse["baseline"];
  canonical: StoredArticle;
  changes: BaselineResponse["changes"];
  revisions: Revision[];
  translationSource: StoredArticle | null;
  translationSourceCurrentHash: string | null;
}

const TRANSLATION_CREATION_FIELDS = new Set([
  "translationKind",
  "translationReviewAction",
  "translationReviewStatus",
  "translationSourceArticleId",
  "translationSourceHash",
]);

const IMMUTABLE_UPDATE_FIELDS = new Set(["kind", "translationGroupId"]);

export async function fetchArticleWorkspace(
  articleId: string,
  signal: AbortSignal
): Promise<ArticleWorkspaceResponse> {
  const workspace = await loadArticleWorkspace({ data: { articleId } });

  if (signal.aborted) {
    throw new DOMException("Article load cancelled", "AbortError");
  }

  if (!workspace) {
    throw new Error("Article request failed");
  }

  return workspace;
}

export const articleWorkspaceQueryOptions = (articleId: string) =>
  queryOptions({
    queryFn: async ({ signal }) =>
      await fetchArticleWorkspace(articleId, signal),
    queryKey: ["studio", "article-workspace", articleId] as const,
  });

export async function fetchArticleBaseline(
  articleId: string
): Promise<BaselineResponse | null> {
  return await loadArticleBaseline({ data: { articleId } });
}

export async function fetchArticleRevisions(
  articleId: string
): Promise<Revision[]> {
  return await loadArticleRevisions({ data: { articleId } });
}

export async function persistArticle({
  articleId,
  baseline,
  payload,
}: PersistArticleInput): Promise<StudioOperationResult<PersistedArticle>> {
  const interactivePayload = Object.fromEntries(
    Object.entries(payload).filter(
      ([field]) => !TRANSLATION_CREATION_FIELDS.has(field)
    )
  );

  if (hasText(articleId)) {
    const updatePayload = Object.fromEntries(
      Object.entries(payload).filter(
        ([field]) => !IMMUTABLE_UPDATE_FIELDS.has(field)
      )
    );

    return await updateArticleMutation({
      data: { articleId, payload: updateArticleSchema.parse(updatePayload) },
    });
  }

  return await createArticleMutation({
    data: createInteractiveArticleSchema.parse({
      ...interactivePayload,
      baseline,
    }),
  });
}

export async function deleteArticleDraft(articleId: string) {
  return await deleteArticleDraftMutation({ data: { articleId } });
}

export async function verifyArticlePublication(
  articleId: string
): Promise<PublicationVerification | null> {
  const result = await verifyArticlePublicationQuery({
    data: { articleId },
  });

  return result.ok ? result.data : null;
}

export async function restoreArticleRevision(
  articleId: string,
  version: number,
  expectedVersion: number
): Promise<StoredArticle | null> {
  const result = await restoreArticleRevisionMutation({
    data: { articleId, expectedVersion, version },
  });

  return result.ok ? storedArticleSchema.parse(result.data.article) : null;
}
