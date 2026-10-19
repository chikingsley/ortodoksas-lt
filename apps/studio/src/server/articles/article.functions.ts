import {
  createInteractiveArticleSchema,
  createTranslationDraftSchema,
  updateArticleSchema,
} from "@ortodoksas-lt/content/article";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";

import { requireStudioEditor } from "../auth";
import { getDatabase } from "../db.server";
import { requireStudioWritesOpen } from "../write-mode";
import {
  createArticle,
  restoreArticleRevision,
  updateArticle,
} from "./article-commands.server";
import { deleteArticleDraft } from "./article-deletion.server";
import {
  getArticleBaseline,
  getArticleRevisions,
  getArticleWorkspace,
} from "./article-queries.server";
import { createTranslationDraft } from "./article-translation.server";
import { verifyArticlePublication } from "./article-verification.server";

const articleIdSchema = z.object({ articleId: z.uuid() });

const articleMutationSchema = articleIdSchema.extend({
  payload: updateArticleSchema,
});

const restoreRevisionSchema = articleIdSchema.extend({
  expectedVersion: z.number().int().nonnegative(),
  version: z.number().int().positive(),
});

const translationDraftSchema = articleIdSchema.extend({
  language: createTranslationDraftSchema.shape.language,
});

export const loadArticleWorkspace = createServerFn({ method: "GET" })
  .validator(articleIdSchema)
  .handler(async ({ data }) => {
    await requireStudioEditor(env);

    return await getArticleWorkspace(getDatabase(env.DB), data.articleId);
  });

export const loadArticleBaseline = createServerFn({ method: "GET" })
  .validator(articleIdSchema)
  .handler(async ({ data }) => {
    await requireStudioEditor(env);

    return await getArticleBaseline(getDatabase(env.DB), data.articleId);
  });

export const loadArticleRevisions = createServerFn({ method: "GET" })
  .validator(articleIdSchema)
  .handler(async ({ data }) => {
    await requireStudioEditor(env);

    return await getArticleRevisions(getDatabase(env.DB), data.articleId);
  });

export const createArticleMutation = createServerFn({ method: "POST" })
  .validator(createInteractiveArticleSchema)
  .handler(async ({ data }) => {
    const editor = await requireStudioEditor(env);
    requireStudioWritesOpen(env);

    return await createArticle({
      database: getDatabase(env.DB),
      editorId: editor.id,
      payload: data,
    });
  });

export const updateArticleMutation = createServerFn({ method: "POST" })
  .validator(articleMutationSchema)
  .handler(async ({ data }) => {
    const editor = await requireStudioEditor(env);
    requireStudioWritesOpen(env);

    return await updateArticle({
      articleId: data.articleId,
      database: getDatabase(env.DB),
      editorId: editor.id,
      payload: data.payload,
    });
  });

export const deleteArticleDraftMutation = createServerFn({ method: "POST" })
  .validator(articleIdSchema)
  .handler(async ({ data }) => {
    await requireStudioEditor(env);
    requireStudioWritesOpen(env);

    return await deleteArticleDraft({
      articleId: data.articleId,
      database: getDatabase(env.DB),
    });
  });

export const restoreArticleRevisionMutation = createServerFn({ method: "POST" })
  .validator(restoreRevisionSchema)
  .handler(async ({ data }) => {
    const editor = await requireStudioEditor(env);
    requireStudioWritesOpen(env);

    return await restoreArticleRevision({
      articleId: data.articleId,
      database: getDatabase(env.DB),
      editorId: editor.id,
      expectedVersion: data.expectedVersion,
      version: data.version,
    });
  });

export const createTranslationDraftMutation = createServerFn({ method: "POST" })
  .validator(translationDraftSchema)
  .handler(async ({ data }) => {
    const editor = await requireStudioEditor(env);
    requireStudioWritesOpen(env);

    return await createTranslationDraft({
      database: getDatabase(env.DB),
      editorId: editor.id,
      language: data.language,
      sourceArticleId: data.articleId,
    });
  });

export const verifyArticlePublicationQuery = createServerFn({ method: "GET" })
  .validator(articleIdSchema)
  .handler(async ({ data }) => {
    await requireStudioEditor(env);

    return await verifyArticlePublication({
      articleId: data.articleId,
      database: getDatabase(env.DB),
      publicationOrigin: env.PUBLICATION_ORIGIN,
    });
  });
