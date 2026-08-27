import { articles, publicationGroups } from "@ortodoksas-lt/db";
import { and, eq, notExists } from "drizzle-orm";

import type { StudioDatabase } from "../db";
import type { StudioOperationResult } from "./article-operations";

export const deleteArticleDraft = async (input: {
  articleId: string;
  database: StudioDatabase;
}): Promise<StudioOperationResult<{ id: string }>> => {
  const draft = await input.database.query.articles.findFirst({
    columns: {
      id: true,
      status: true,
      translationGroupId: true,
      translationKind: true,
    },
    where: eq(articles.id, input.articleId),
  });
  if (!draft) {
    return { error: "Article unavailable", ok: false, status: 404 };
  }
  if (draft.status !== "draft") {
    return {
      error: "Only drafts can be deleted",
      ok: false,
      status: 422,
    };
  }

  const linkedTranslation =
    draft.translationKind === "original"
      ? await input.database.query.articles.findFirst({
          columns: { id: true },
          where: eq(articles.translationSourceArticleId, draft.id),
        })
      : undefined;
  if (draft.translationKind === "original" && linkedTranslation) {
    return {
      error: "Delete the linked translation drafts first",
      ok: false,
      status: 409,
    };
  }

  const [deleted] = await input.database.batch([
    input.database
      .delete(articles)
      .where(and(eq(articles.id, draft.id), eq(articles.status, "draft")))
      .returning({ id: articles.id }),
    input.database
      .delete(publicationGroups)
      .where(
        and(
          eq(publicationGroups.id, draft.translationGroupId),
          notExists(
            input.database
              .select({ id: articles.id })
              .from(articles)
              .where(eq(articles.translationGroupId, draft.translationGroupId))
          )
        )
      ),
  ]);

  if (deleted.length === 0) {
    return {
      error: "Draft state changed before deletion",
      ok: false,
      status: 409,
    };
  }
  return { data: { id: draft.id }, ok: true };
};
