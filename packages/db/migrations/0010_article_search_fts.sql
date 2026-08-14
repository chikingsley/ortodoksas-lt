CREATE VIRTUAL TABLE `articles_fts` USING fts5(
	`title`,
	`summary`,
	`section`,
	`labels_json`,
	`body_text`,
	content='',
	tokenize='unicode61 remove_diacritics 2'
);
--> statement-breakpoint
CREATE TRIGGER `articles_fts_after_insert`
AFTER INSERT ON `articles`
BEGIN
	INSERT INTO `articles_fts` (`rowid`, `title`, `summary`, `section`, `labels_json`, `body_text`)
	VALUES (
		new.`rowid`,
		new.`title`,
		new.`summary`,
		new.`section`,
		new.`labels_json`,
		COALESCE(
			(
				SELECT GROUP_CONCAT(`node`.`atom`, ' ')
				FROM json_tree(new.`body_json`) AS `node`
				WHERE `node`.`key` = 'text' AND `node`.`type` = 'text'
			),
			''
		)
	);
END;
--> statement-breakpoint
CREATE TRIGGER `articles_fts_after_delete`
AFTER DELETE ON `articles`
BEGIN
	INSERT INTO `articles_fts` (`articles_fts`, `rowid`, `title`, `summary`, `section`, `labels_json`, `body_text`)
	VALUES (
		'delete',
		old.`rowid`,
		old.`title`,
		old.`summary`,
		old.`section`,
		old.`labels_json`,
		COALESCE(
			(
				SELECT GROUP_CONCAT(`node`.`atom`, ' ')
				FROM json_tree(old.`body_json`) AS `node`
				WHERE `node`.`key` = 'text' AND `node`.`type` = 'text'
			),
			''
		)
	);
END;
--> statement-breakpoint
CREATE TRIGGER `articles_fts_after_update`
AFTER UPDATE OF `title`, `summary`, `section`, `labels_json`, `body_json` ON `articles`
BEGIN
	INSERT INTO `articles_fts` (`articles_fts`, `rowid`, `title`, `summary`, `section`, `labels_json`, `body_text`)
	VALUES (
		'delete',
		old.`rowid`,
		old.`title`,
		old.`summary`,
		old.`section`,
		old.`labels_json`,
		COALESCE(
			(
				SELECT GROUP_CONCAT(`node`.`atom`, ' ')
				FROM json_tree(old.`body_json`) AS `node`
				WHERE `node`.`key` = 'text' AND `node`.`type` = 'text'
			),
			''
		)
	);
	INSERT INTO `articles_fts` (`rowid`, `title`, `summary`, `section`, `labels_json`, `body_text`)
	VALUES (
		new.`rowid`,
		new.`title`,
		new.`summary`,
		new.`section`,
		new.`labels_json`,
		COALESCE(
			(
				SELECT GROUP_CONCAT(`node`.`atom`, ' ')
				FROM json_tree(new.`body_json`) AS `node`
				WHERE `node`.`key` = 'text' AND `node`.`type` = 'text'
			),
			''
		)
	);
END;
--> statement-breakpoint
INSERT INTO `articles_fts` (`rowid`, `title`, `summary`, `section`, `labels_json`, `body_text`)
SELECT
	`articles`.`rowid`,
	`articles`.`title`,
	`articles`.`summary`,
	`articles`.`section`,
	`articles`.`labels_json`,
	COALESCE(
		(
			SELECT GROUP_CONCAT(`node`.`atom`, ' ')
			FROM json_tree(`articles`.`body_json`) AS `node`
			WHERE `node`.`key` = 'text' AND `node`.`type` = 'text'
		),
		''
	)
FROM `articles`;
