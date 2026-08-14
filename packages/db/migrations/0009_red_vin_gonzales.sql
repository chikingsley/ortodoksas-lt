-- D1 keeps foreign-key enforcement enabled and large table rebuilds can exceed
-- the per-request CPU budget. These triggers provide the same restrict-style
-- relationship without copying the production articles table.
CREATE TRIGGER `articles_translation_group_before_insert`
BEFORE INSERT ON `articles`
WHEN NOT EXISTS (
	SELECT 1 FROM `publication_groups`
	WHERE `publication_groups`.`id` = new.`translation_group_id`
)
BEGIN
	SELECT RAISE(ABORT, 'translation_group_id must reference publication_groups.id');
END;
--> statement-breakpoint
CREATE TRIGGER `articles_translation_group_before_update`
BEFORE UPDATE OF `translation_group_id` ON `articles`
WHEN NOT EXISTS (
	SELECT 1 FROM `publication_groups`
	WHERE `publication_groups`.`id` = new.`translation_group_id`
)
BEGIN
	SELECT RAISE(ABORT, 'translation_group_id must reference publication_groups.id');
END;
--> statement-breakpoint
CREATE TRIGGER `publication_groups_restrict_delete`
BEFORE DELETE ON `publication_groups`
WHEN EXISTS (
	SELECT 1 FROM `articles`
	WHERE `articles`.`translation_group_id` = old.`id`
)
BEGIN
	SELECT RAISE(ABORT, 'publication group is referenced by articles');
END;
--> statement-breakpoint
CREATE TRIGGER `publication_groups_restrict_id_update`
BEFORE UPDATE OF `id` ON `publication_groups`
WHEN new.`id` <> old.`id` AND EXISTS (
	SELECT 1 FROM `articles`
	WHERE `articles`.`translation_group_id` = old.`id`
)
BEGIN
	SELECT RAISE(ABORT, 'publication group is referenced by articles');
END;
