import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const mediaAssets = sqliteTable(
  "media_assets",
  {
    altText: text("alt_text").notNull().default(""),
    altTextProvenance: text("alt_text_provenance").notNull().default("missing"),
    byteSize: integer("byte_size").notNull(),
    caption: text("caption").notNull().default(""),
    captionProvenance: text("caption_provenance").notNull().default("missing"),
    createdAt: integer("created_at").notNull(),
    credit: text("credit").notNull().default(""),
    fileName: text("file_name").notNull(),
    height: integer("height"),
    id: text("id").primaryKey(),
    mimeType: text("mime_type").notNull(),
    provenance: text("provenance").notNull().default("uploaded"),
    r2Key: text("r2_key").notNull(),
    sha256: text("sha256"),
    sourceUrl: text("source_url"),
    updatedAt: integer("updated_at").notNull(),
    width: integer("width"),
  },
  (table) => [
    uniqueIndex("media_assets_r2_key_unique").on(table.r2Key),
    uniqueIndex("media_assets_sha256_unique").on(table.sha256),
  ]
);

export const mediaAliases = sqliteTable(
  "media_aliases",
  {
    alias: text("alias").primaryKey(),
    createdAt: integer("created_at").notNull(),
    mediaId: text("media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
  },
  (table) => [index("media_aliases_media_id_idx").on(table.mediaId)]
);

export const articles = sqliteTable(
  "articles",
  {
    bodyJson: text("body_json").notNull(),
    createdAt: integer("created_at").notNull(),
    heroMediaId: text("hero_media_id").references(() => mediaAssets.id),
    id: text("id").primaryKey(),
    kind: text("kind").notNull().default("article"),
    labelsJson: text("labels_json").notNull().default("[]"),
    language: text("language").notNull(),
    publishedAt: integer("published_at"),
    section: text("section").notNull().default(""),
    seoDescription: text("seo_description"),
    seoTitle: text("seo_title"),
    slug: text("slug").notNull(),
    sourceArticleId: text("source_article_id"),
    sourceCapture: text("source_capture"),
    sourceHtml: text("source_html"),
    sourceUrl: text("source_url"),
    status: text("status").notNull().default("draft"),
    summary: text("summary").notNull().default(""),
    title: text("title").notNull(),
    translationGroupId: text("translation_group_id").notNull(),
    translationKind: text("translation_kind").notNull().default("original"),
    translationReviewedAt: integer("translation_reviewed_at"),
    translationReviewedBy: text("translation_reviewed_by"),
    translationReviewStatus: text("translation_review_status")
      .notNull()
      .default("not_required"),
    translationSourceArticleId: text(
      "translation_source_article_id"
    ).references((): AnySQLiteColumn => articles.id, { onDelete: "set null" }),
    translationSourceHash: text("translation_source_hash"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("articles_language_slug_unique").on(table.language, table.slug),
    index("articles_status_updated_idx").on(table.status, table.updatedAt),
    index("articles_translation_group_idx").on(table.translationGroupId),
  ]
);

export const translationRuns = sqliteTable(
  "translation_runs",
  {
    characterCount: integer("character_count").notNull().default(0),
    completedAt: integer("completed_at"),
    createdAt: integer("created_at").notNull(),
    error: text("error"),
    id: text("id").primaryKey(),
    model: text("model").notNull(),
    provider: text("provider").notNull(),
    sourceArticleId: text("source_article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    sourceHash: text("source_hash").notNull(),
    sourceLanguage: text("source_language").notNull(),
    status: text("status").notNull().default("queued"),
    targetArticleId: text("target_article_id").references(() => articles.id, {
      onDelete: "set null",
    }),
    targetLanguage: text("target_language").notNull(),
  },
  (table) => [
    index("translation_runs_source_idx").on(
      table.sourceArticleId,
      table.targetLanguage,
      table.createdAt
    ),
    index("translation_runs_status_idx").on(table.status, table.createdAt),
  ]
);

export const articleRevisions = sqliteTable(
  "article_revisions",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    bodyJson: text("body_json").notNull(),
    createdAt: integer("created_at").notNull(),
    editorId: text("editor_id").notNull(),
    id: text("id").primaryKey(),
    metadataJson: text("metadata_json").notNull(),
    version: integer("version").notNull(),
  },
  (table) => [
    uniqueIndex("article_revisions_article_version_unique").on(
      table.articleId,
      table.version
    ),
  ]
);

export const articleBaselines = sqliteTable("article_baselines", {
  articleId: text("article_id")
    .primaryKey()
    .references(() => articles.id, { onDelete: "cascade" }),
  bodyJson: text("body_json").notNull(),
  converterVersion: text("converter_version").notNull(),
  createdAt: integer("created_at").notNull(),
  sourceHash: text("source_hash").notNull(),
  summary: text("summary").notNull().default(""),
  title: text("title").notNull(),
});

export const articleContentChanges = sqliteTable(
  "article_content_changes",
  {
    afterValue: text("after_value"),
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    beforeValue: text("before_value"),
    changeKind: text("change_kind").notNull(),
    createdAt: integer("created_at").notNull(),
    fieldPath: text("field_path").notNull(),
    id: text("id").primaryKey(),
    provenance: text("provenance").notNull(),
  },
  (table) => [
    index("article_content_changes_article_idx").on(
      table.articleId,
      table.createdAt
    ),
  ]
);

export const homepagePlacements = sqliteTable(
  "homepage_placements",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
    endsAt: integer("ends_at"),
    id: text("id").primaryKey(),
    position: integer("position").notNull().default(0),
    slot: text("slot").notNull(),
    startsAt: integer("starts_at"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("homepage_placements_slot_position_idx").on(
      table.slot,
      table.position
    ),
  ]
);
