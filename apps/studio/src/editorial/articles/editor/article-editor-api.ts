import {
  createArticleMutation,
  loadArticleBaseline,
  loadArticleRevisions,
  loadArticleWorkspace,
  restoreArticleRevisionMutation,
  updateArticleMutation,
  verifyArticlePublicationQuery,
} from "@/server/article-functions";
import type { StudioOperationResult } from "../../../../worker/services/article-operations";
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

interface PersistedArticle {
  heroMediaId: string | null;
  id: string;
  publishedAt: number | null;
  status: string;
  translationReviewStatus: string;
  version: number;
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
  return workspace as ArticleWorkspaceResponse;
}

export async function fetchArticleBaseline(
  articleId: string
): Promise<BaselineResponse | null> {
  return (await loadArticleBaseline({
    data: { articleId },
  })) as BaselineResponse | null;
}

export async function fetchArticleRevisions(
  articleId: string
): Promise<Revision[]> {
  return (await loadArticleRevisions({ data: { articleId } })) as Revision[];
}

export function persistArticle({
  articleId,
  baseline,
  payload,
}: PersistArticleInput): Promise<StudioOperationResult<PersistedArticle>> {
  const interactivePayload = Object.fromEntries(
    Object.entries(payload).filter(
      ([field]) => !TRANSLATION_CREATION_FIELDS.has(field)
    )
  );
  if (articleId) {
    const updatePayload = Object.fromEntries(
      Object.entries(payload).filter(
        ([field]) => !IMMUTABLE_UPDATE_FIELDS.has(field)
      )
    );
    return updateArticleMutation({
      data: { articleId, payload: updatePayload },
    });
  }
  return createArticleMutation({
    data: { ...interactivePayload, baseline },
  });
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
  return result.ok ? (result.data.article as StoredArticle) : null;
}
