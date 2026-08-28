import {
  articleContentChanges,
  articleRevisions,
  mediaAssets,
} from "@ortodoksas-lt/db";
import type { ContentChange } from "@ortodoksas-lt/editor/provenance";
import { eq, sql } from "drizzle-orm";
import { alias, unionAll } from "drizzle-orm/sqlite-core";

import type { StudioDatabase } from "../db.server";

const CONTENT_CHANGE_INSERT_SIZE = 10;
const MEDIA_PATH_PATTERN = /^\/api\/media\/(media_[0-9a-f]{64})$/u;

const toHex = (value: ArrayBuffer): string =>
  [...new Uint8Array(value)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const hashText = async (value: string): Promise<string> =>
  toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));

export const textChangeProvenance = (
  beforeValue: string,
  afterValue: string
): "manual" | "normalized" =>
  beforeValue.trim() === afterValue ? "normalized" : "manual";

export const insertContentChanges = async (
  database: StudioDatabase,
  articleId: string,
  timestamp: number,
  changes: readonly ContentChange[]
): Promise<void> => {
  await Promise.all(
    contentChangeInsertQueries(database, articleId, timestamp, changes)
  );
};

export const contentChangeInsertQueries = (
  database: StudioDatabase,
  articleId: string,
  timestamp: number,
  changes: readonly ContentChange[],
  guardRevisionId?: string
) => {
  const batchCount = Math.ceil(changes.length / CONTENT_CHANGE_INSERT_SIZE);
  return Array.from({ length: batchCount }, (_, batchIndex) => {
    const start = batchIndex * CONTENT_CHANGE_INSERT_SIZE;
    const batch = changes.slice(start, start + CONTENT_CHANGE_INSERT_SIZE);
    const values = batch.map((change) => ({
      afterValue: change.afterValue,
      articleId,
      beforeValue: change.beforeValue,
      changeKind: change.changeKind,
      createdAt: timestamp,
      fieldPath: change.fieldPath,
      id: crypto.randomUUID(),
      provenance: change.provenance,
    }));
    if (!guardRevisionId) {
      return database.insert(articleContentChanges).values(values);
    }
    const guardRevision = alias(
      articleRevisions,
      `content_change_guard_${batchIndex}`
    );
    const guardedSelects = values.map((value) =>
      database
        .select({
          afterValue: sql<string | null>`${value.afterValue}`.as("after_value"),
          articleId: sql<string>`${value.articleId}`.as("article_id"),
          beforeValue: sql<string | null>`${value.beforeValue}`.as(
            "before_value"
          ),
          changeKind: sql<string>`${value.changeKind}`.as("change_kind"),
          createdAt: sql<number>`${value.createdAt}`.as("created_at"),
          fieldPath: sql<string>`${value.fieldPath}`.as("field_path"),
          id: sql<string>`${value.id}`.as("id"),
          provenance: sql<string>`${value.provenance}`.as("provenance"),
        })
        .from(guardRevision)
        .where(eq(guardRevision.id, guardRevisionId))
    );
    const [first, second, ...remaining] = guardedSelects;
    if (!first) {
      return database.insert(articleContentChanges).values(values);
    }
    const guardedChanges = second
      ? unionAll(first, second, ...remaining)
      : first;
    return database.insert(articleContentChanges).select(guardedChanges);
  });
};

export const findMediaId = async (
  database: StudioDatabase,
  source: string | undefined
): Promise<string | null> => {
  if (!source) {
    return null;
  }
  const mediaPath = MEDIA_PATH_PATTERN.exec(source);
  if (!mediaPath) {
    return null;
  }
  const [, mediaId] = mediaPath;
  if (!mediaId) {
    return null;
  }
  const [record] = await database
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, mediaId))
    .limit(1);
  return record?.id ?? null;
};
