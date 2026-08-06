PRAGMA foreign_keys = ON;

CREATE TABLE media_assets (
  id TEXT PRIMARY KEY NOT NULL,
  r2_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT DEFAULT '' NOT NULL,
  caption TEXT DEFAULT '' NOT NULL,
  credit TEXT DEFAULT '' NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX media_assets_r2_key_unique ON media_assets (r2_key);

CREATE TABLE articles (
  id TEXT PRIMARY KEY NOT NULL,
  translation_group_id TEXT NOT NULL,
  source_article_id TEXT,
  language TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '' NOT NULL,
  body_json TEXT NOT NULL,
  status TEXT DEFAULT 'draft' NOT NULL,
  translation_kind TEXT DEFAULT 'original' NOT NULL,
  hero_media_id TEXT REFERENCES media_assets(id),
  seo_title TEXT,
  seo_description TEXT,
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX articles_language_slug_unique ON articles (language, slug);
CREATE INDEX articles_status_updated_idx ON articles (status, updated_at);
CREATE INDEX articles_translation_group_idx ON articles (translation_group_id);

CREATE TABLE article_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  editor_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  body_json TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX article_revisions_article_version_unique
  ON article_revisions (article_id, version);

CREATE TABLE homepage_placements (
  id TEXT PRIMARY KEY NOT NULL,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  slot TEXT NOT NULL,
  position INTEGER DEFAULT 0 NOT NULL,
  starts_at INTEGER,
  ends_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX homepage_placements_slot_position_idx
  ON homepage_placements (slot, position);
