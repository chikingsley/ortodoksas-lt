import { articles } from "@ortodoksas-lt/db";
import { eq } from "drizzle-orm";

import type { StudioDatabase } from "../db.server";
import {
  type StudioOperationResult,
  success,
} from "./article-operation-support.server";
import { publicArticleUrl } from "./article-publication.server";

export const verifyArticlePublication = async (input: {
  articleId: string;
  database: StudioDatabase;
  publicationOrigin: string | undefined;
}): Promise<
  StudioOperationResult<{
    reachable: boolean;
    status: number | null;
    url: string;
  }>
> => {
  const [article] = await input.database
    .select({
      language: articles.language,
      slug: articles.slug,
      status: articles.status,
    })
    .from(articles)
    .where(eq(articles.id, input.articleId))
    .limit(1);
  if (!article) {
    return { error: "Article unavailable", ok: false, status: 404 };
  }
  if (article.status !== "published") {
    return {
      error: "Article is awaiting publication",
      ok: false,
      status: 409,
    };
  }
  if (!input.publicationOrigin) {
    return {
      error: "Publication origin is unavailable",
      ok: false,
      status: 503,
    };
  }
  const url = publicArticleUrl(
    input.publicationOrigin,
    article.language,
    article.slug
  );
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    return success({ reachable: response.ok, status: response.status, url });
  } catch {
    return success({ reachable: false, status: null, url });
  }
};
