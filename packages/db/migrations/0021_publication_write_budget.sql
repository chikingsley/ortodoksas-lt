-- Keep archive-count maintenance proportional to the affected edition or group.
DROP TRIGGER articles_counts_delete;
DROP TRIGGER articles_counts_update;
DROP TRIGGER publication_group_counts_update;
DROP TRIGGER publication_group_counts_delete;

CREATE TRIGGER articles_counts_delete AFTER DELETE ON articles BEGIN
 UPDATE publication_counts SET total = total - 1 WHERE language = OLD.language AND section = OLD.section AND month = COALESCE(strftime('%Y-%m', OLD.published_at / 1000, 'unixepoch'), '')
 AND OLD.status = 'published' AND EXISTS (SELECT 1 FROM publication_groups WHERE id = OLD.translation_group_id AND kind = 'article');
 DELETE FROM publication_counts WHERE total = 0 AND language = OLD.language AND section = OLD.section AND month = COALESCE(strftime('%Y-%m', OLD.published_at / 1000, 'unixepoch'), '');
END;

CREATE TRIGGER articles_counts_update AFTER UPDATE OF status, language, section, published_at, translation_group_id ON articles
WHEN OLD.status IS NOT NEW.status OR OLD.language IS NOT NEW.language OR OLD.section IS NOT NEW.section
 OR OLD.published_at IS NOT NEW.published_at OR OLD.translation_group_id IS NOT NEW.translation_group_id
BEGIN
 UPDATE publication_counts SET total = total - 1 WHERE language = OLD.language AND section = OLD.section AND month = COALESCE(strftime('%Y-%m', OLD.published_at / 1000, 'unixepoch'), '')
 AND OLD.status = 'published' AND EXISTS (SELECT 1 FROM publication_groups WHERE id = OLD.translation_group_id AND kind = 'article');
 INSERT INTO publication_counts(language, section, month, total)
 SELECT NEW.language, NEW.section, COALESCE(strftime('%Y-%m', NEW.published_at / 1000, 'unixepoch'), ''), 1
 WHERE NEW.status = 'published' AND EXISTS (SELECT 1 FROM publication_groups WHERE id = NEW.translation_group_id AND kind = 'article')
 ON CONFLICT(language, section, month) DO UPDATE SET total = total + 1;
 DELETE FROM publication_counts WHERE total = 0 AND language = OLD.language AND section = OLD.section AND month = COALESCE(strftime('%Y-%m', OLD.published_at / 1000, 'unixepoch'), '');
END;

CREATE TRIGGER publication_group_counts_update AFTER UPDATE OF kind ON publication_groups WHEN OLD.kind IS NOT NEW.kind BEGIN
 UPDATE publication_counts SET total = total - (
 SELECT COUNT(*) FROM articles a WHERE a.status = 'published' AND a.translation_group_id = OLD.id
 AND a.language = publication_counts.language AND a.section = publication_counts.section AND COALESCE(strftime('%Y-%m', a.published_at / 1000, 'unixepoch'), '') = publication_counts.month
) WHERE OLD.kind = 'article' AND (language, section, month) IN (
 SELECT a.language, a.section, COALESCE(strftime('%Y-%m', a.published_at / 1000, 'unixepoch'), '') FROM articles a WHERE a.status = 'published' AND a.translation_group_id = OLD.id
);
DELETE FROM publication_counts WHERE total = 0 AND (language, section, month) IN (
 SELECT a.language, a.section, COALESCE(strftime('%Y-%m', a.published_at / 1000, 'unixepoch'), '') FROM articles a WHERE a.status = 'published' AND a.translation_group_id = OLD.id
);
 INSERT INTO publication_counts(language, section, month, total)
 SELECT a.language, a.section, COALESCE(strftime('%Y-%m', a.published_at / 1000, 'unixepoch'), ''), COUNT(*) FROM articles a
 WHERE NEW.kind = 'article' AND a.status = 'published' AND a.translation_group_id = NEW.id
 GROUP BY a.language, a.section, COALESCE(strftime('%Y-%m', a.published_at / 1000, 'unixepoch'), '')
 ON CONFLICT(language, section, month) DO UPDATE SET total = total + excluded.total;
END;

CREATE TRIGGER publication_group_counts_delete AFTER DELETE ON publication_groups WHEN OLD.kind = 'article' BEGIN
 UPDATE publication_counts SET total = total - (
 SELECT COUNT(*) FROM articles a WHERE a.status = 'published' AND a.translation_group_id = OLD.id
 AND a.language = publication_counts.language AND a.section = publication_counts.section AND COALESCE(strftime('%Y-%m', a.published_at / 1000, 'unixepoch'), '') = publication_counts.month
) WHERE OLD.kind = 'article' AND (language, section, month) IN (
 SELECT a.language, a.section, COALESCE(strftime('%Y-%m', a.published_at / 1000, 'unixepoch'), '') FROM articles a WHERE a.status = 'published' AND a.translation_group_id = OLD.id
);
DELETE FROM publication_counts WHERE total = 0 AND (language, section, month) IN (
 SELECT a.language, a.section, COALESCE(strftime('%Y-%m', a.published_at / 1000, 'unixepoch'), '') FROM articles a WHERE a.status = 'published' AND a.translation_group_id = OLD.id
);
END;
