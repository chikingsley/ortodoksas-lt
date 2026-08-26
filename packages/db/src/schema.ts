import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  primaryKey,
  real,
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
    updatedAt: integer("updated_at").notNull(),
    width: integer("width"),
  },
  (table) => [
    uniqueIndex("media_assets_r2_key_unique").on(table.r2Key),
    uniqueIndex("media_assets_sha256_unique").on(table.sha256),
  ]
);

export const publicationGroups = sqliteTable(
  "publication_groups",
  {
    createdAt: integer("created_at").notNull(),
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    pageTemplate: text("page_template").notNull().default("standard"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    check(
      "publication_groups_kind_check",
      sql`${table.kind} IN ('article', 'page')`
    ),
    check(
      "publication_groups_page_template_check",
      sql`${table.pageTemplate} IN ('standard', 'calendar', 'people_directory', 'community_directory', 'contact', 'library', 'support')`
    ),
    check(
      "publication_groups_kind_template_check",
      sql`${table.kind} = 'page' OR ${table.pageTemplate} = 'standard'`
    ),
  ]
);

export const articles = sqliteTable(
  "articles",
  {
    bodyJson: text("body_json").notNull(),
    byline: text("byline"),
    bylineType: text("byline_type").notNull().default("person"),
    bylineUrl: text("byline_url"),
    createdAt: integer("created_at").notNull(),
    heroFit: text("hero_fit").notNull().default("cover"),
    heroFocalX: integer("hero_focal_x").notNull().default(50),
    heroFocalY: integer("hero_focal_y").notNull().default(50),
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
    status: text("status").notNull().default("draft"),
    summary: text("summary").notNull().default(""),
    title: text("title").notNull(),
    // D1 migration 0009 enforces this relationship with restrict-style
    // triggers so production never requires a full articles-table rebuild.
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
    uniqueIndex("articles_translation_group_language_unique").on(
      table.translationGroupId,
      table.language
    ),
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

export const homepageLayoutState = sqliteTable("homepage_layout_state", {
  id: text("id").primaryKey(),
  revision: text("revision").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const homepagePlacements = sqliteTable(
  "homepage_placements",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
    endsAt: integer("ends_at"),
    id: text("id").primaryKey(),
    layoutRevision: text("layout_revision").notNull().default("initial"),
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
    index("homepage_placements_layout_revision_idx").on(table.layoutRevision),
  ]
);

export const people = sqliteTable(
  "people",
  {
    createdAt: integer("created_at").notNull(),
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("draft"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("people_slug_unique").on(table.slug),
    index("people_status_sort_idx").on(table.status, table.sortOrder),
    check(
      "people_status_check",
      sql`${table.status} IN ('draft', 'published', 'archived')`
    ),
    check("people_sort_order_check", sql`${table.sortOrder} >= 0`),
  ]
);

export const personLocalizations = sqliteTable(
  "person_localizations",
  {
    alternateName: text("alternate_name").notNull().default(""),
    biographyJson: text("biography_json").notNull(),
    displayName: text("display_name").notNull(),
    honorific: text("honorific").notNull().default(""),
    language: text("language").notNull(),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    seoDescription: text("seo_description").notNull().default(""),
  },
  (table) => [
    primaryKey({ columns: [table.personId, table.language] }),
    check(
      "person_localizations_language_check",
      sql`${table.language} IN ('lt', 'en', 'ru', 'uk', 'be')`
    ),
  ]
);

export const communities = sqliteTable(
  "communities",
  {
    addressLine: text("address_line").notNull().default(""),
    countryCode: text("country_code").notNull().default("LT"),
    createdAt: integer("created_at").notNull(),
    id: text("id").primaryKey(),
    latitude: real("latitude"),
    locality: text("locality").notNull().default(""),
    longitude: real("longitude"),
    operationalStatus: text("operational_status").notNull().default("active"),
    postalCode: text("postal_code").notNull().default(""),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("draft"),
    type: text("type").notNull().default("community"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("communities_slug_unique").on(table.slug),
    index("communities_status_sort_idx").on(table.status, table.sortOrder),
    check(
      "communities_status_check",
      sql`${table.status} IN ('draft', 'published', 'archived')`
    ),
    check(
      "communities_type_check",
      sql`${table.type} IN ('parish', 'church', 'chapel', 'mission', 'monastery', 'community')`
    ),
    check(
      "communities_operational_status_check",
      sql`${table.operationalStatus} IN ('active', 'forming', 'inactive')`
    ),
    check("communities_sort_order_check", sql`${table.sortOrder} >= 0`),
    check(
      "communities_coordinates_check",
      sql`(${table.latitude} IS NULL AND ${table.longitude} IS NULL) OR (${table.latitude} IS NOT NULL AND ${table.longitude} IS NOT NULL)`
    ),
    check(
      "communities_latitude_check",
      sql`${table.latitude} IS NULL OR (${table.latitude} >= -90 AND ${table.latitude} <= 90)`
    ),
    check(
      "communities_longitude_check",
      sql`${table.longitude} IS NULL OR (${table.longitude} >= -180 AND ${table.longitude} <= 180)`
    ),
    check(
      "communities_country_code_check",
      sql`length(${table.countryCode}) = 2 AND ${table.countryCode} = upper(${table.countryCode})`
    ),
  ]
);

export const communityLocalizations = sqliteTable(
  "community_localizations",
  {
    accessibility: text("accessibility").notNull().default(""),
    addressLabel: text("address_label").notNull().default(""),
    communityId: text("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    description: text("description").notNull().default(""),
    directions: text("directions").notNull().default(""),
    language: text("language").notNull(),
    name: text("name").notNull(),
    operationalNotice: text("operational_notice").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
  },
  (table) => [
    primaryKey({ columns: [table.communityId, table.language] }),
    check(
      "community_localizations_language_check",
      sql`${table.language} IN ('lt', 'en', 'ru', 'uk', 'be')`
    ),
  ]
);

export const personPositions = sqliteTable(
  "person_positions",
  {
    communityId: text("community_id").references(() => communities.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at").notNull(),
    endsAt: integer("ends_at"),
    id: text("id").primaryKey(),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    roleKey: text("role_key").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    startsAt: integer("starts_at"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("person_positions_person_sort_idx").on(
      table.personId,
      table.sortOrder
    ),
    index("person_positions_community_idx").on(table.communityId),
    check("person_positions_sort_order_check", sql`${table.sortOrder} >= 0`),
    check(
      "person_positions_dates_check",
      sql`${table.startsAt} IS NULL OR ${table.endsAt} IS NULL OR ${table.startsAt} <= ${table.endsAt}`
    ),
  ]
);

export const personContacts = sqliteTable(
  "person_contacts",
  {
    createdAt: integer("created_at").notNull(),
    href: text("href").notNull(),
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("person_contacts_person_sort_idx").on(
      table.personId,
      table.sortOrder
    ),
    check(
      "person_contacts_kind_check",
      sql`${table.kind} IN ('email', 'phone', 'website', 'facebook', 'instagram', 'telegram', 'other')`
    ),
    check("person_contacts_sort_order_check", sql`${table.sortOrder} >= 0`),
  ]
);

export const personContactLocalizations = sqliteTable(
  "person_contact_localizations",
  {
    label: text("label").notNull(),
    language: text("language").notNull(),
    personContactId: text("person_contact_id")
      .notNull()
      .references(() => personContacts.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.personContactId, table.language] }),
    check(
      "person_contact_localizations_language_check",
      sql`${table.language} IN ('lt', 'en', 'ru', 'uk', 'be')`
    ),
  ]
);

export const personPositionLocalizations = sqliteTable(
  "person_position_localizations",
  {
    description: text("description").notNull().default(""),
    language: text("language").notNull(),
    positionId: text("position_id")
      .notNull()
      .references(() => personPositions.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.positionId, table.language] }),
    check(
      "person_position_localizations_language_check",
      sql`${table.language} IN ('lt', 'en', 'ru', 'uk', 'be')`
    ),
  ]
);

export const communityContacts = sqliteTable(
  "community_contacts",
  {
    communityId: text("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
    href: text("href").notNull(),
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("community_contacts_community_sort_idx").on(
      table.communityId,
      table.sortOrder
    ),
    check(
      "community_contacts_kind_check",
      sql`${table.kind} IN ('email', 'phone', 'website', 'facebook', 'instagram', 'telegram', 'other')`
    ),
    check("community_contacts_sort_order_check", sql`${table.sortOrder} >= 0`),
  ]
);

export const communityContactLocalizations = sqliteTable(
  "community_contact_localizations",
  {
    communityContactId: text("community_contact_id")
      .notNull()
      .references(() => communityContacts.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    language: text("language").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.communityContactId, table.language] }),
    check(
      "community_contact_localizations_language_check",
      sql`${table.language} IN ('lt', 'en', 'ru', 'uk', 'be')`
    ),
  ]
);

export const communityServices = sqliteTable(
  "community_services",
  {
    communityId: text("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
    endsAt: integer("ends_at"),
    id: text("id").primaryKey(),
    sortOrder: integer("sort_order").notNull().default(0),
    startsAt: integer("starts_at"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("community_services_community_sort_idx").on(
      table.communityId,
      table.sortOrder
    ),
    check("community_services_sort_order_check", sql`${table.sortOrder} >= 0`),
    check(
      "community_services_dates_check",
      sql`${table.startsAt} IS NULL OR ${table.endsAt} IS NULL OR ${table.startsAt} <= ${table.endsAt}`
    ),
  ]
);

export const communityServiceLocalizations = sqliteTable(
  "community_service_localizations",
  {
    communityServiceId: text("community_service_id")
      .notNull()
      .references(() => communityServices.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    scheduleText: text("schedule_text").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.communityServiceId, table.language] }),
    check(
      "community_service_localizations_language_check",
      sql`${table.language} IN ('lt', 'en', 'ru', 'uk', 'be')`
    ),
  ]
);

export const personMedia = sqliteTable(
  "person_media",
  {
    createdAt: integer("created_at").notNull(),
    id: text("id").primaryKey(),
    mediaId: text("media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("gallery"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("person_media_person_media_unique").on(
      table.personId,
      table.mediaId
    ),
    index("person_media_person_sort_idx").on(table.personId, table.sortOrder),
    uniqueIndex("person_media_one_primary_unique")
      .on(table.personId)
      .where(sql`${table.role} = 'primary'`),
    check(
      "person_media_role_check",
      sql`${table.role} IN ('primary', 'gallery')`
    ),
    check("person_media_sort_order_check", sql`${table.sortOrder} >= 0`),
  ]
);

export const communityMedia = sqliteTable(
  "community_media",
  {
    communityId: text("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
    id: text("id").primaryKey(),
    mediaId: text("media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    role: text("role").notNull().default("gallery"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("community_media_community_media_unique").on(
      table.communityId,
      table.mediaId
    ),
    index("community_media_community_sort_idx").on(
      table.communityId,
      table.sortOrder
    ),
    uniqueIndex("community_media_one_primary_unique")
      .on(table.communityId)
      .where(sql`${table.role} = 'primary'`),
    check(
      "community_media_role_check",
      sql`${table.role} IN ('primary', 'gallery')`
    ),
    check("community_media_sort_order_check", sql`${table.sortOrder} >= 0`),
  ]
);

export const personMediaLocalizations = sqliteTable(
  "person_media_localizations",
  {
    altText: text("alt_text").notNull(),
    caption: text("caption").notNull().default(""),
    language: text("language").notNull(),
    personMediaId: text("person_media_id")
      .notNull()
      .references(() => personMedia.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.personMediaId, table.language] }),
    check(
      "person_media_localizations_language_check",
      sql`${table.language} IN ('lt', 'en', 'ru', 'uk', 'be')`
    ),
  ]
);

export const communityMediaLocalizations = sqliteTable(
  "community_media_localizations",
  {
    altText: text("alt_text").notNull(),
    caption: text("caption").notNull().default(""),
    communityMediaId: text("community_media_id")
      .notNull()
      .references(() => communityMedia.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.communityMediaId, table.language] }),
    check(
      "community_media_localizations_language_check",
      sql`${table.language} IN ('lt', 'en', 'ru', 'uk', 'be')`
    ),
  ]
);
