-- Bound publication lookups and keep cache invalidation in the same D1 transaction as edits.
CREATE INDEX articles_public_language_date_idx ON articles(status, language, published_at DESC);
CREATE INDEX articles_public_section_date_idx ON articles(status, language, section, published_at DESC);
CREATE INDEX articles_public_slug_idx ON articles(status, slug, language);
CREATE INDEX articles_public_group_idx ON articles(status, translation_group_id, language);
CREATE INDEX articles_editorial_updated_idx ON articles(updated_at DESC);
CREATE TABLE publication_state (id INTEGER PRIMARY KEY CONSTRAINT publication_state_singleton CHECK (id = 1), revision INTEGER NOT NULL DEFAULT 1);
INSERT INTO publication_state(id, revision) VALUES (1, 1);
CREATE TRIGGER articles_publication_revision_insert AFTER INSERT ON articles
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER articles_publication_revision_update AFTER UPDATE ON articles
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER articles_publication_revision_delete AFTER DELETE ON articles
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER publication_groups_publication_revision_insert AFTER INSERT ON publication_groups
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER publication_groups_publication_revision_update AFTER UPDATE ON publication_groups
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER publication_groups_publication_revision_delete AFTER DELETE ON publication_groups
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER media_assets_publication_revision_insert AFTER INSERT ON media_assets
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER media_assets_publication_revision_update AFTER UPDATE ON media_assets
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER media_assets_publication_revision_delete AFTER DELETE ON media_assets
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER homepage_layout_state_publication_revision_insert AFTER INSERT ON homepage_layout_state
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER homepage_layout_state_publication_revision_update AFTER UPDATE ON homepage_layout_state
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER homepage_layout_state_publication_revision_delete AFTER DELETE ON homepage_layout_state
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER homepage_placements_publication_revision_insert AFTER INSERT ON homepage_placements
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER homepage_placements_publication_revision_update AFTER UPDATE ON homepage_placements
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER homepage_placements_publication_revision_delete AFTER DELETE ON homepage_placements
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER people_publication_revision_insert AFTER INSERT ON people
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER people_publication_revision_update AFTER UPDATE ON people
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER people_publication_revision_delete AFTER DELETE ON people
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_localizations_publication_revision_insert AFTER INSERT ON person_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_localizations_publication_revision_update AFTER UPDATE ON person_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_localizations_publication_revision_delete AFTER DELETE ON person_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_contacts_publication_revision_insert AFTER INSERT ON person_contacts
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_contacts_publication_revision_update AFTER UPDATE ON person_contacts
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_contacts_publication_revision_delete AFTER DELETE ON person_contacts
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_contact_localizations_publication_revision_insert AFTER INSERT ON person_contact_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_contact_localizations_publication_revision_update AFTER UPDATE ON person_contact_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_contact_localizations_publication_revision_delete AFTER DELETE ON person_contact_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_positions_publication_revision_insert AFTER INSERT ON person_positions
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_positions_publication_revision_update AFTER UPDATE ON person_positions
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_positions_publication_revision_delete AFTER DELETE ON person_positions
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_position_localizations_publication_revision_insert AFTER INSERT ON person_position_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_position_localizations_publication_revision_update AFTER UPDATE ON person_position_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_position_localizations_publication_revision_delete AFTER DELETE ON person_position_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_media_publication_revision_insert AFTER INSERT ON person_media
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_media_publication_revision_update AFTER UPDATE ON person_media
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_media_publication_revision_delete AFTER DELETE ON person_media
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_media_localizations_publication_revision_insert AFTER INSERT ON person_media_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_media_localizations_publication_revision_update AFTER UPDATE ON person_media_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER person_media_localizations_publication_revision_delete AFTER DELETE ON person_media_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER communities_publication_revision_insert AFTER INSERT ON communities
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER communities_publication_revision_update AFTER UPDATE ON communities
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER communities_publication_revision_delete AFTER DELETE ON communities
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_localizations_publication_revision_insert AFTER INSERT ON community_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_localizations_publication_revision_update AFTER UPDATE ON community_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_localizations_publication_revision_delete AFTER DELETE ON community_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_contacts_publication_revision_insert AFTER INSERT ON community_contacts
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_contacts_publication_revision_update AFTER UPDATE ON community_contacts
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_contacts_publication_revision_delete AFTER DELETE ON community_contacts
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_contact_localizations_publication_revision_insert AFTER INSERT ON community_contact_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_contact_localizations_publication_revision_update AFTER UPDATE ON community_contact_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_contact_localizations_publication_revision_delete AFTER DELETE ON community_contact_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_services_publication_revision_insert AFTER INSERT ON community_services
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_services_publication_revision_update AFTER UPDATE ON community_services
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_services_publication_revision_delete AFTER DELETE ON community_services
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_service_localizations_publication_revision_insert AFTER INSERT ON community_service_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_service_localizations_publication_revision_update AFTER UPDATE ON community_service_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_service_localizations_publication_revision_delete AFTER DELETE ON community_service_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_media_publication_revision_insert AFTER INSERT ON community_media
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_media_publication_revision_update AFTER UPDATE ON community_media
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_media_publication_revision_delete AFTER DELETE ON community_media
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_media_localizations_publication_revision_insert AFTER INSERT ON community_media_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_media_localizations_publication_revision_update AFTER UPDATE ON community_media_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;
CREATE TRIGGER community_media_localizations_publication_revision_delete AFTER DELETE ON community_media_localizations
BEGIN UPDATE publication_state SET revision = revision + 1 WHERE id = 1; END;

-- Maintain small archive summaries at edit time instead of scanning the publication per visitor.
CREATE TABLE publication_counts (language TEXT NOT NULL, section TEXT NOT NULL, month TEXT NOT NULL, total INTEGER NOT NULL, PRIMARY KEY(language, section, month)) WITHOUT ROWID;
INSERT INTO publication_counts(language, section, month, total)
 SELECT a.language, a.section, COALESCE(strftime('%Y-%m', a.published_at / 1000, 'unixepoch'), ''), COUNT(*) FROM articles a INNER JOIN publication_groups p ON p.id = a.translation_group_id WHERE a.status = 'published' AND p.kind = 'article' GROUP BY a.language, a.section, COALESCE(strftime('%Y-%m', a.published_at / 1000, 'unixepoch'), '');
CREATE INDEX articles_public_hero_date_idx ON articles(status, language, published_at DESC) WHERE hero_media_id IS NOT NULL;
CREATE TRIGGER articles_counts_insert AFTER INSERT ON articles BEGIN INSERT INTO publication_counts(language, section, month, total)
 SELECT NEW.language, NEW.section, COALESCE(strftime('%Y-%m', NEW.published_at / 1000, 'unixepoch'), ''), 1
 WHERE NEW.status = 'published' AND EXISTS (SELECT 1 FROM publication_groups WHERE id = NEW.translation_group_id AND kind = 'article')
 ON CONFLICT(language, section, month) DO UPDATE SET total = total + 1; END;
CREATE TRIGGER articles_counts_delete AFTER DELETE ON articles BEGIN UPDATE publication_counts SET total = total - 1 WHERE language = OLD.language AND section = OLD.section AND month = COALESCE(strftime('%Y-%m', OLD.published_at / 1000, 'unixepoch'), '') AND OLD.status = 'published' AND EXISTS (SELECT 1 FROM publication_groups WHERE id = OLD.translation_group_id AND kind = 'article');
 DELETE FROM publication_counts WHERE total = 0; END;
CREATE TRIGGER articles_counts_update AFTER UPDATE OF status, language, section, published_at, translation_group_id ON articles BEGIN UPDATE publication_counts SET total = total - 1 WHERE language = OLD.language AND section = OLD.section AND month = COALESCE(strftime('%Y-%m', OLD.published_at / 1000, 'unixepoch'), '') AND OLD.status = 'published' AND EXISTS (SELECT 1 FROM publication_groups WHERE id = OLD.translation_group_id AND kind = 'article');
 DELETE FROM publication_counts WHERE total = 0;
 INSERT INTO publication_counts(language, section, month, total)
 SELECT NEW.language, NEW.section, COALESCE(strftime('%Y-%m', NEW.published_at / 1000, 'unixepoch'), ''), 1
 WHERE NEW.status = 'published' AND EXISTS (SELECT 1 FROM publication_groups WHERE id = NEW.translation_group_id AND kind = 'article')
 ON CONFLICT(language, section, month) DO UPDATE SET total = total + 1; END;
CREATE TRIGGER publication_group_counts_update AFTER UPDATE OF kind ON publication_groups WHEN OLD.kind <> NEW.kind BEGIN DELETE FROM publication_counts; INSERT INTO publication_counts(language, section, month, total)
 SELECT a.language, a.section, COALESCE(strftime('%Y-%m', a.published_at / 1000, 'unixepoch'), ''), COUNT(*) FROM articles a INNER JOIN publication_groups p ON p.id = a.translation_group_id WHERE a.status = 'published' AND p.kind = 'article' GROUP BY a.language, a.section, COALESCE(strftime('%Y-%m', a.published_at / 1000, 'unixepoch'), ''); END;

-- Cascading group deletion removes its articles before this final summary rebuild.
CREATE TRIGGER publication_group_counts_delete AFTER DELETE ON publication_groups BEGIN
 DELETE FROM publication_counts;
 INSERT INTO publication_counts(language, section, month, total)
 SELECT a.language, a.section, COALESCE(strftime('%Y-%m', a.published_at / 1000, 'unixepoch'), ''), COUNT(*)
 FROM articles a INNER JOIN publication_groups p ON p.id = a.translation_group_id
 WHERE a.status = 'published' AND p.kind = 'article'
 GROUP BY a.language, a.section, COALESCE(strftime('%Y-%m', a.published_at / 1000, 'unixepoch'), '');
END;
