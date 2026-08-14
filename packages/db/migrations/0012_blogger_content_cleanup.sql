DROP TABLE IF EXISTS `_blogger_cleanup_media_targets`;--> statement-breakpoint
DROP TABLE IF EXISTS `_blogger_cleanup_media_documents`;--> statement-breakpoint
DROP TABLE IF EXISTS `_blogger_cleanup_link_candidates`;--> statement-breakpoint
DROP TABLE IF EXISTS `_blogger_cleanup_link_targets`;--> statement-breakpoint
DROP TABLE IF EXISTS `_blogger_cleanup_link_documents`;--> statement-breakpoint
DROP TABLE IF EXISTS `_blogger_cleanup_gate`;--> statement-breakpoint

CREATE TABLE `_blogger_cleanup_media_targets` (
	`corpus` text NOT NULL,
	`row_id` text NOT NULL,
	`json_path` text NOT NULL,
	`media_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY (`corpus`, `row_id`, `position`)
);--> statement-breakpoint

INSERT INTO `_blogger_cleanup_media_targets` (
	`corpus`, `row_id`, `json_path`, `media_id`, `position`
)
SELECT
	`candidate`.`corpus`,
	`candidate`.`row_id`,
	`candidate`.`json_path`,
	`candidate`.`media_id`,
	row_number() OVER (
		PARTITION BY `candidate`.`corpus`, `candidate`.`row_id`
		ORDER BY `candidate`.`json_path`
	)
FROM (
	SELECT
		'article_revisions' AS `corpus`,
		`revision`.`id` AS `row_id`,
		`node`.`fullkey` AS `json_path`,
		`alias`.`media_id` AS `media_id`
	FROM `article_revisions` AS `revision`, json_tree(`revision`.`body_json`) AS `node`
	INNER JOIN `media_aliases` AS `alias`
		ON `alias`.`alias` = json_extract(`node`.`value`, '$.attrs.src')
	WHERE
		`node`.`type` = 'object'
		AND json_extract(`node`.`value`, '$.type') = 'figure'
		AND json_extract(`node`.`value`, '$.attrs.mediaId') IS NULL
	UNION ALL
	SELECT
		'article_baselines' AS `corpus`,
		`baseline`.`article_id` AS `row_id`,
		`node`.`fullkey` AS `json_path`,
		`alias`.`media_id` AS `media_id`
	FROM `article_baselines` AS `baseline`, json_tree(`baseline`.`body_json`) AS `node`
	INNER JOIN `media_aliases` AS `alias`
		ON `alias`.`alias` = json_extract(`node`.`value`, '$.attrs.src')
	WHERE
		`node`.`type` = 'object'
		AND json_extract(`node`.`value`, '$.type') = 'figure'
		AND json_extract(`node`.`value`, '$.attrs.mediaId') IS NULL
) AS `candidate`;--> statement-breakpoint

CREATE TABLE `_blogger_cleanup_media_documents` (
	`corpus` text NOT NULL,
	`row_id` text NOT NULL,
	`body_json` text NOT NULL,
	PRIMARY KEY (`corpus`, `row_id`)
);--> statement-breakpoint

INSERT INTO `_blogger_cleanup_media_documents` (`corpus`, `row_id`, `body_json`)
WITH RECURSIVE `source_document` (`corpus`, `row_id`, `body_json`) AS (
	SELECT 'article_revisions', `id`, `body_json` FROM `article_revisions`
	UNION ALL
	SELECT 'article_baselines', `article_id`, `body_json` FROM `article_baselines`
),
`rewrite` (`corpus`, `row_id`, `position`, `last_position`, `body_json`) AS (
	SELECT
		`target`.`corpus`,
		`target`.`row_id`,
		0,
		max(`target`.`position`),
		`source_document`.`body_json`
	FROM `_blogger_cleanup_media_targets` AS `target`
	INNER JOIN `source_document`
		ON `source_document`.`corpus` = `target`.`corpus`
		AND `source_document`.`row_id` = `target`.`row_id`
	GROUP BY `target`.`corpus`, `target`.`row_id`
	UNION ALL
	SELECT
		`rewrite`.`corpus`,
		`rewrite`.`row_id`,
		`target`.`position`,
		`rewrite`.`last_position`,
		json_set(
			`rewrite`.`body_json`,
			`target`.`json_path` || '.attrs.mediaId',
			`target`.`media_id`,
			`target`.`json_path` || '.attrs.src',
			'/api/media/' || `target`.`media_id`
		)
	FROM `rewrite`
	INNER JOIN `_blogger_cleanup_media_targets` AS `target`
		ON `target`.`corpus` = `rewrite`.`corpus`
		AND `target`.`row_id` = `rewrite`.`row_id`
		AND `target`.`position` = `rewrite`.`position` + 1
)
SELECT `corpus`, `row_id`, `body_json`
FROM `rewrite`
WHERE `position` = `last_position`;--> statement-breakpoint

UPDATE `article_revisions`
SET `body_json` = (
	SELECT `document`.`body_json`
	FROM `_blogger_cleanup_media_documents` AS `document`
	WHERE
		`document`.`corpus` = 'article_revisions'
		AND `document`.`row_id` = `article_revisions`.`id`
)
WHERE EXISTS (
	SELECT 1
	FROM `_blogger_cleanup_media_documents` AS `document`
	WHERE
		`document`.`corpus` = 'article_revisions'
		AND `document`.`row_id` = `article_revisions`.`id`
);--> statement-breakpoint

UPDATE `article_baselines`
SET `body_json` = (
	SELECT `document`.`body_json`
	FROM `_blogger_cleanup_media_documents` AS `document`
	WHERE
		`document`.`corpus` = 'article_baselines'
		AND `document`.`row_id` = `article_baselines`.`article_id`
)
WHERE EXISTS (
	SELECT 1
	FROM `_blogger_cleanup_media_documents` AS `document`
	WHERE
		`document`.`corpus` = 'article_baselines'
		AND `document`.`row_id` = `article_baselines`.`article_id`
);--> statement-breakpoint

CREATE TABLE `_blogger_cleanup_link_candidates` (
	`corpus` text NOT NULL,
	`row_id` text NOT NULL,
	`json_path` text NOT NULL,
	`json_key` text NOT NULL,
	`original_value` text NOT NULL,
	`internal_path` text
);--> statement-breakpoint

INSERT INTO `_blogger_cleanup_link_candidates` (
	`corpus`, `row_id`, `json_path`, `json_key`, `original_value`, `internal_path`
)
SELECT
	`raw`.`corpus`,
	`raw`.`row_id`,
	`raw`.`json_path`,
	`raw`.`json_key`,
	`raw`.`original_value`,
	CASE
		WHEN `raw`.`original_value` LIKE '/%' THEN `raw`.`original_value`
		WHEN lower(`raw`.`original_value`) LIKE 'https://be.ortodoksas.lt/%'
			THEN '/be' || substr(`raw`.`original_value`, length('https://be.ortodoksas.lt') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'http://be.ortodoksas.lt/%'
			THEN '/be' || substr(`raw`.`original_value`, length('http://be.ortodoksas.lt') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'https://en.ortodoksas.lt/%'
			THEN '/en' || substr(`raw`.`original_value`, length('https://en.ortodoksas.lt') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'http://en.ortodoksas.lt/%'
			THEN '/en' || substr(`raw`.`original_value`, length('http://en.ortodoksas.lt') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'https://ru.ortodoksas.lt/%'
			THEN '/ru' || substr(`raw`.`original_value`, length('https://ru.ortodoksas.lt') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'http://ru.ortodoksas.lt/%'
			THEN '/ru' || substr(`raw`.`original_value`, length('http://ru.ortodoksas.lt') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'https://uk.ortodoksas.lt/%'
			THEN '/uk' || substr(`raw`.`original_value`, length('https://uk.ortodoksas.lt') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'http://uk.ortodoksas.lt/%'
			THEN '/uk' || substr(`raw`.`original_value`, length('http://uk.ortodoksas.lt') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'https://ortodoksas-be.blogspot.com/%'
			THEN '/be' || substr(`raw`.`original_value`, length('https://ortodoksas-be.blogspot.com') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'http://ortodoksas-be.blogspot.com/%'
			THEN '/be' || substr(`raw`.`original_value`, length('http://ortodoksas-be.blogspot.com') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'https://ortodoksas-en.blogspot.com/%'
			THEN '/en' || substr(`raw`.`original_value`, length('https://ortodoksas-en.blogspot.com') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'http://ortodoksas-en.blogspot.com/%'
			THEN '/en' || substr(`raw`.`original_value`, length('http://ortodoksas-en.blogspot.com') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'https://ortodoksas-ru.blogspot.com/%'
			THEN '/ru' || substr(`raw`.`original_value`, length('https://ortodoksas-ru.blogspot.com') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'http://ortodoksas-ru.blogspot.com/%'
			THEN '/ru' || substr(`raw`.`original_value`, length('http://ortodoksas-ru.blogspot.com') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'https://ortodoksas-uk.blogspot.com/%'
			THEN '/uk' || substr(`raw`.`original_value`, length('https://ortodoksas-uk.blogspot.com') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'http://ortodoksas-uk.blogspot.com/%'
			THEN '/uk' || substr(`raw`.`original_value`, length('http://ortodoksas-uk.blogspot.com') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'https://www.ortodoksas.lt/%'
			THEN substr(`raw`.`original_value`, length('https://www.ortodoksas.lt') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'http://www.ortodoksas.lt/%'
			THEN substr(`raw`.`original_value`, length('http://www.ortodoksas.lt') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'https://ortodoksas.lt/%'
			THEN substr(`raw`.`original_value`, length('https://ortodoksas.lt') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'http://ortodoksas.lt/%'
			THEN substr(`raw`.`original_value`, length('http://ortodoksas.lt') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'https://www.ortodoksas.blogspot.com/%'
			THEN substr(`raw`.`original_value`, length('https://www.ortodoksas.blogspot.com') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'http://www.ortodoksas.blogspot.com/%'
			THEN substr(`raw`.`original_value`, length('http://www.ortodoksas.blogspot.com') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'https://ortodoksas.blogspot.com/%'
			THEN substr(`raw`.`original_value`, length('https://ortodoksas.blogspot.com') + 1)
		WHEN lower(`raw`.`original_value`) LIKE 'http://ortodoksas.blogspot.com/%'
			THEN substr(`raw`.`original_value`, length('http://ortodoksas.blogspot.com') + 1)
	END
FROM (
	SELECT 'articles' AS `corpus`, `article`.`id` AS `row_id`, `value`.`fullkey` AS `json_path`, CAST(`value`.`key` AS text) AS `json_key`, `value`.`value` AS `original_value`
	FROM `articles` AS `article`, json_tree(`article`.`body_json`) AS `value`
	WHERE `value`.`type` = 'text' AND `value`.`key` IN ('href', 'text') AND instr(`value`.`value`, '.html') > 0
	UNION ALL
	SELECT 'article_revisions', `revision`.`id`, `value`.`fullkey`, CAST(`value`.`key` AS text), `value`.`value`
	FROM `article_revisions` AS `revision`, json_tree(`revision`.`body_json`) AS `value`
	WHERE `value`.`type` = 'text' AND `value`.`key` IN ('href', 'text') AND instr(`value`.`value`, '.html') > 0
	UNION ALL
	SELECT 'article_baselines', `baseline`.`article_id`, `value`.`fullkey`, CAST(`value`.`key` AS text), `value`.`value`
	FROM `article_baselines` AS `baseline`, json_tree(`baseline`.`body_json`) AS `value`
	WHERE `value`.`type` = 'text' AND `value`.`key` IN ('href', 'text') AND instr(`value`.`value`, '.html') > 0
) AS `raw`;--> statement-breakpoint

CREATE TABLE `_blogger_cleanup_link_targets` (
	`corpus` text NOT NULL,
	`row_id` text NOT NULL,
	`json_path` text NOT NULL,
	`canonical_value` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY (`corpus`, `row_id`, `position`)
);--> statement-breakpoint

INSERT INTO `_blogger_cleanup_link_targets` (
	`corpus`, `row_id`, `json_path`, `canonical_value`, `position`
)
SELECT
	`eligible`.`corpus`,
	`eligible`.`row_id`,
	`eligible`.`json_path`,
	CASE
		WHEN `eligible`.`json_key` = 'text' AND lower(`eligible`.`original_value`) LIKE 'http%'
			THEN 'https://ortodoksas.lt' || `eligible`.`canonical_path`
		ELSE `eligible`.`canonical_path`
	END,
	row_number() OVER (
		PARTITION BY `eligible`.`corpus`, `eligible`.`row_id`
		ORDER BY `eligible`.`json_path`
	)
FROM (
	SELECT
		`candidate`.*,
		substr(`candidate`.`internal_path`, 1, instr(`candidate`.`internal_path`, '.html') - 1)
			|| substr(`candidate`.`internal_path`, instr(`candidate`.`internal_path`, '.html') + length('.html')) AS `canonical_path`
	FROM `_blogger_cleanup_link_candidates` AS `candidate`
	WHERE
		`candidate`.`internal_path` IS NOT NULL
		AND instr(`candidate`.`internal_path`, '.html') > 0
		AND substr(
			`candidate`.`internal_path`,
			instr(`candidate`.`internal_path`, '.html') + length('.html'),
			1
		) IN ('', '?', '#')
		AND (
			`candidate`.`internal_path` GLOB '/p/*.html*'
			OR `candidate`.`internal_path` GLOB '/[12][0-9][0-9][0-9]/[01][0-9]/*.html*'
			OR (
				substr(`candidate`.`internal_path`, 2, 2) IN ('be', 'en', 'ru', 'uk')
				AND (
					`candidate`.`internal_path` GLOB '/??/p/*.html*'
					OR `candidate`.`internal_path` GLOB '/??/[12][0-9][0-9][0-9]/[01][0-9]/*.html*'
				)
			)
		)
) AS `eligible`;--> statement-breakpoint

CREATE TABLE `_blogger_cleanup_link_documents` (
	`corpus` text NOT NULL,
	`row_id` text NOT NULL,
	`body_json` text NOT NULL,
	PRIMARY KEY (`corpus`, `row_id`)
);--> statement-breakpoint

INSERT INTO `_blogger_cleanup_link_documents` (`corpus`, `row_id`, `body_json`)
WITH RECURSIVE `source_document` (`corpus`, `row_id`, `body_json`) AS (
	SELECT 'articles', `id`, `body_json` FROM `articles`
	UNION ALL
	SELECT 'article_revisions', `id`, `body_json` FROM `article_revisions`
	UNION ALL
	SELECT 'article_baselines', `article_id`, `body_json` FROM `article_baselines`
),
`rewrite` (`corpus`, `row_id`, `position`, `last_position`, `body_json`) AS (
	SELECT
		`target`.`corpus`,
		`target`.`row_id`,
		0,
		max(`target`.`position`),
		`source_document`.`body_json`
	FROM `_blogger_cleanup_link_targets` AS `target`
	INNER JOIN `source_document`
		ON `source_document`.`corpus` = `target`.`corpus`
		AND `source_document`.`row_id` = `target`.`row_id`
	GROUP BY `target`.`corpus`, `target`.`row_id`
	UNION ALL
	SELECT
		`rewrite`.`corpus`,
		`rewrite`.`row_id`,
		`target`.`position`,
		`rewrite`.`last_position`,
		json_set(`rewrite`.`body_json`, `target`.`json_path`, `target`.`canonical_value`)
	FROM `rewrite`
	INNER JOIN `_blogger_cleanup_link_targets` AS `target`
		ON `target`.`corpus` = `rewrite`.`corpus`
		AND `target`.`row_id` = `rewrite`.`row_id`
		AND `target`.`position` = `rewrite`.`position` + 1
)
SELECT `corpus`, `row_id`, `body_json`
FROM `rewrite`
WHERE `position` = `last_position`;--> statement-breakpoint

UPDATE `articles`
SET `body_json` = (
	SELECT `document`.`body_json`
	FROM `_blogger_cleanup_link_documents` AS `document`
	WHERE `document`.`corpus` = 'articles' AND `document`.`row_id` = `articles`.`id`
)
WHERE EXISTS (
	SELECT 1 FROM `_blogger_cleanup_link_documents` AS `document`
	WHERE `document`.`corpus` = 'articles' AND `document`.`row_id` = `articles`.`id`
);--> statement-breakpoint

UPDATE `article_revisions`
SET `body_json` = (
	SELECT `document`.`body_json`
	FROM `_blogger_cleanup_link_documents` AS `document`
	WHERE `document`.`corpus` = 'article_revisions' AND `document`.`row_id` = `article_revisions`.`id`
)
WHERE EXISTS (
	SELECT 1 FROM `_blogger_cleanup_link_documents` AS `document`
	WHERE `document`.`corpus` = 'article_revisions' AND `document`.`row_id` = `article_revisions`.`id`
);--> statement-breakpoint

UPDATE `article_baselines`
SET `body_json` = (
	SELECT `document`.`body_json`
	FROM `_blogger_cleanup_link_documents` AS `document`
	WHERE `document`.`corpus` = 'article_baselines' AND `document`.`row_id` = `article_baselines`.`article_id`
)
WHERE EXISTS (
	SELECT 1 FROM `_blogger_cleanup_link_documents` AS `document`
	WHERE `document`.`corpus` = 'article_baselines' AND `document`.`row_id` = `article_baselines`.`article_id`
);--> statement-breakpoint

UPDATE `article_revisions`
SET `metadata_json` = json_remove(
	`metadata_json`,
	'$.sourceArticleId',
	'$.sourceCapture',
	'$.sourceUrl'
);--> statement-breakpoint

CREATE TABLE `_blogger_cleanup_gate` (
	`mismatch_count` integer NOT NULL CHECK (`mismatch_count` = 0)
);--> statement-breakpoint

INSERT INTO `_blogger_cleanup_gate` (`mismatch_count`)
SELECT COUNT(*)
FROM `_blogger_cleanup_media_targets` AS `target`
INNER JOIN (
	SELECT 'article_revisions' AS `corpus`, `id` AS `row_id`, `body_json` FROM `article_revisions`
	UNION ALL
	SELECT 'article_baselines', `article_id`, `body_json` FROM `article_baselines`
) AS `document`
	ON `document`.`corpus` = `target`.`corpus` AND `document`.`row_id` = `target`.`row_id`
WHERE
	json_extract(`document`.`body_json`, `target`.`json_path` || '.attrs.mediaId') IS NOT `target`.`media_id`
	OR json_extract(`document`.`body_json`, `target`.`json_path` || '.attrs.src') IS NOT '/api/media/' || `target`.`media_id`;--> statement-breakpoint

DELETE FROM `_blogger_cleanup_gate`;--> statement-breakpoint
INSERT INTO `_blogger_cleanup_gate` (`mismatch_count`)
SELECT COUNT(*)
FROM `_blogger_cleanup_link_targets` AS `target`
INNER JOIN (
	SELECT 'articles' AS `corpus`, `id` AS `row_id`, `body_json` FROM `articles`
	UNION ALL
	SELECT 'article_revisions', `id`, `body_json` FROM `article_revisions`
	UNION ALL
	SELECT 'article_baselines', `article_id`, `body_json` FROM `article_baselines`
) AS `document`
	ON `document`.`corpus` = `target`.`corpus` AND `document`.`row_id` = `target`.`row_id`
WHERE json_extract(`document`.`body_json`, `target`.`json_path`) IS NOT `target`.`canonical_value`;--> statement-breakpoint

DELETE FROM `_blogger_cleanup_gate`;--> statement-breakpoint
INSERT INTO `_blogger_cleanup_gate` (`mismatch_count`)
SELECT COUNT(*)
FROM `article_revisions`
WHERE
	json_type(`metadata_json`, '$.sourceArticleId') IS NOT NULL
	OR json_type(`metadata_json`, '$.sourceCapture') IS NOT NULL
	OR json_type(`metadata_json`, '$.sourceUrl') IS NOT NULL;--> statement-breakpoint

DROP TABLE `_blogger_cleanup_gate`;--> statement-breakpoint
DROP TABLE `_blogger_cleanup_link_documents`;--> statement-breakpoint
DROP TABLE `_blogger_cleanup_link_targets`;--> statement-breakpoint
DROP TABLE `_blogger_cleanup_link_candidates`;--> statement-breakpoint
DROP TABLE `_blogger_cleanup_media_documents`;--> statement-breakpoint
DROP TABLE `_blogger_cleanup_media_targets`;--> statement-breakpoint

DROP TABLE `media_aliases`;--> statement-breakpoint
ALTER TABLE `articles` DROP COLUMN `source_article_id`;--> statement-breakpoint
ALTER TABLE `articles` DROP COLUMN `source_capture`;--> statement-breakpoint
ALTER TABLE `articles` DROP COLUMN `source_html`;--> statement-breakpoint
ALTER TABLE `articles` DROP COLUMN `source_url`;--> statement-breakpoint
ALTER TABLE `media_assets` DROP COLUMN `source_url`;
