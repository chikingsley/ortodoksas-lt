import type {
  ArticleResponse,
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
}

export async function fetchArticleWorkspace(
  articleId: string,
  signal: AbortSignal
): Promise<ArticleWorkspaceResponse> {
  const [storedResponse, baselineResponse, revisionResponse] =
    await Promise.all([
      fetch(`/api/articles/${articleId}`, { signal }),
      fetch(`/api/articles/${articleId}/baseline`, { signal }),
      fetch(`/api/articles/${articleId}/revisions`, { signal }),
    ]);
  if (!storedResponse.ok) {
    throw new Error("Article request failed");
  }

  const { article: canonical } =
    (await storedResponse.json()) as ArticleResponse;
  const { baseline, changes } = baselineResponse.ok
    ? ((await baselineResponse.json()) as BaselineResponse)
    : {
        baseline: { body_json: canonical.bodyJson },
        changes: [],
      };
  const revisions = revisionResponse.ok
    ? ((await revisionResponse.json()) as { revisions: Revision[] }).revisions
    : [];
  const translationSourceResponse = canonical.translationSourceArticleId
    ? await fetch(`/api/articles/${canonical.translationSourceArticleId}`, {
        signal,
      })
    : null;
  const translationSource =
    translationSourceResponse?.ok === true
      ? ((await translationSourceResponse.json()) as ArticleResponse).article
      : null;

  return { baseline, canonical, changes, revisions, translationSource };
}

export async function fetchArticleBaseline(
  articleId: string
): Promise<BaselineResponse | null> {
  const response = await fetch(`/api/articles/${articleId}/baseline`);
  return response.ok ? ((await response.json()) as BaselineResponse) : null;
}

export async function fetchArticleRevisions(
  articleId: string
): Promise<Revision[]> {
  const response = await fetch(`/api/articles/${articleId}/revisions`);
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as { revisions: Revision[] };
  return data.revisions;
}

export function persistArticle({
  articleId,
  baseline,
  payload,
  sourceArticleId,
}: PersistArticleInput): Promise<Response> {
  return fetch(articleId ? `/api/articles/${articleId}` : "/api/articles", {
    body: JSON.stringify(
      articleId ? payload : { ...payload, baseline, sourceArticleId }
    ),
    headers: { "content-type": "application/json" },
    method: articleId ? "PUT" : "POST",
  });
}

export async function verifyArticlePublication(
  articleId: string
): Promise<PublicationVerification | null> {
  const response = await fetch(`/api/articles/${articleId}/publication`);
  return response.ok
    ? ((await response.json()) as PublicationVerification)
    : null;
}

export async function restoreArticleRevision(
  articleId: string,
  version: number
): Promise<StoredArticle | null> {
  const response = await fetch(
    `/api/articles/${articleId}/revisions/${version}/restore`,
    { method: "POST" }
  );
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { article: StoredArticle };
  return data.article;
}
