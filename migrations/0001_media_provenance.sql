ALTER TABLE media_assets ADD COLUMN sha256 TEXT;
ALTER TABLE media_assets ADD COLUMN source_url TEXT;
ALTER TABLE media_assets ADD COLUMN provenance TEXT DEFAULT 'uploaded' NOT NULL;
ALTER TABLE media_assets ADD COLUMN alt_text_provenance TEXT DEFAULT 'missing' NOT NULL;
ALTER TABLE media_assets ADD COLUMN caption_provenance TEXT DEFAULT 'missing' NOT NULL;

CREATE UNIQUE INDEX media_assets_sha256_unique
  ON media_assets (sha256) WHERE sha256 IS NOT NULL;

CREATE TABLE media_aliases (
  alias TEXT PRIMARY KEY NOT NULL,
  media_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

CREATE INDEX media_aliases_media_id_idx ON media_aliases (media_id);

CREATE TABLE article_baselines (
  article_id TEXT PRIMARY KEY NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '' NOT NULL,
  body_json TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  converter_version TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE article_content_changes (
  id TEXT PRIMARY KEY NOT NULL,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  field_path TEXT NOT NULL,
  change_kind TEXT NOT NULL,
  provenance TEXT NOT NULL,
  before_value TEXT,
  after_value TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX article_content_changes_article_idx
  ON article_content_changes (article_id, created_at);
