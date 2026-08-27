import { env } from "cloudflare:workers";
import {
  createInteractiveArticleSchema,
  createTranslationDraftSchema,
} from "@ortodoksas-lt/content/article";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getDatabase } from "../../worker/db";
import { deleteArticleDraft } from "../../worker/services/article-deletion";
import {
  createArticle,
  getArticleBaseline,
  getArticleRevisions,
  getArticleWorkspace,
  restoreArticleRevision,
  updateArticle,
  verifyArticlePublication,
} from "../../worker/services/article-operations";
import { createTranslationDraft } from "../../worker/services/article-translation";
import { requireStudioEditor } from "./auth";
import { requireStudioWritesOpen } from "./write-mode";

const articleIdSchema = z.object({ articleId: z.string().uuid() });
const articleMutationSchema = articleIdSchema.extend({ payload: z.unknown() });
const restoreRevisionSchema = articleIdSchema.extend({
  expectedVersion: z.number().int().nonnegative(),
  version: z.number().int().positive(),
});
const translationDraftSchema = articleIdSchema.extend({
  language: createTranslationDraftSchema.shape.language,
});

export const loadArticleWorkspace = createServerFn({ method: "GET" })
  .validator((input: unknown) => articleIdSchema.parse(input))
  .handler(async ({ data }) => {
    await requireStudioEditor(env);
    return getArticleWorkspace(getDatabase(env.DB), data.articleId);
  });

export const loadArticleBaseline = createServerFn({ method: "GET" })
  .validator((input: unknown) => articleIdSchema.parse(input))
  .handler(async ({ data }) => {
    await requireStudioEditor(env);
    return getArticleBaseline(getDatabase(env.DB), data.articleId);
  });

export const loadArticleRevisions = createServerFn({ method: "GET" })
  .validator((input: unknown) => articleIdSchema.parse(input))
  .handler(async ({ data }) => {
    await requireStudioEditor(env);
    return getArticleRevisions(getDatabase(env.DB), data.articleId);
  });

export const createArticleMutation = createServerFn({ method: "POST" })
  .validator((payload: unknown) =>
    createInteractiveArticleSchema.parse(payload)
  )
  .handler(async ({ data }) => {
    const editor = await requireStudioEditor(env);
    requireStudioWritesOpen(env);
    return createArticle({
      database: getDatabase(env.DB),
      editorId: editor.id,
      payload: data,
    });
  });

export const updateArticleMutation = createServerFn({ method: "POST" })
  .validator((input: unknown) => articleMutationSchema.parse(input))
  .handler(async ({ data }) => {
    const editor = await requireStudioEditor(env);
    requireStudioWritesOpen(env);
    return updateArticle({
      articleId: data.articleId,
      database: getDatabase(env.DB),
      editorId: editor.id,
      payload: data.payload,
    });
  });

export const deleteArticleDraftMutation = createServerFn({ method: "POST" })
  .validator((input: unknown) => articleIdSchema.parse(input))
  .handler(async ({ data }) => {
    await requireStudioEditor(env);
    requireStudioWritesOpen(env);
    return deleteArticleDraft({
      articleId: data.articleId,
      database: getDatabase(env.DB),
    });
  });

export const restoreArticleRevisionMutation = createServerFn({ method: "POST" })
  .validator((input: unknown) => restoreRevisionSchema.parse(input))
  .handler(async ({ data }) => {
    const editor = await requireStudioEditor(env);
    requireStudioWritesOpen(env);
    return restoreArticleRevision({
      articleId: data.articleId,
      database: getDatabase(env.DB),
      editorId: editor.id,
      expectedVersion: data.expectedVersion,
      version: data.version,
    });
  });

export const createTranslationDraftMutation = createServerFn({ method: "POST" })
  .validator((input: unknown) => translationDraftSchema.parse(input))
  .handler(async ({ data }) => {
    const editor = await requireStudioEditor(env);
    requireStudioWritesOpen(env);
    return createTranslationDraft({
      database: getDatabase(env.DB),
      editorId: editor.id,
      language: data.language,
      sourceArticleId: data.articleId,
    });
  });

export const verifyArticlePublicationQuery = createServerFn({ method: "GET" })
  .validator((input: unknown) => articleIdSchema.parse(input))
  .handler(async ({ data }) => {
    await requireStudioEditor(env);
    return verifyArticlePublication({
      articleId: data.articleId,
      database: getDatabase(env.DB),
      publicationOrigin: env.PUBLICATION_ORIGIN,
    });
  });
