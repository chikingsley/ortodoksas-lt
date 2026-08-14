DROP TABLE IF EXISTS `_baseline_media_cleanup_candidates`;--> statement-breakpoint
DROP TABLE IF EXISTS `_baseline_media_cleanup_targets`;--> statement-breakpoint
DROP TABLE IF EXISTS `_baseline_media_cleanup_documents`;--> statement-breakpoint
DROP TABLE IF EXISTS `_baseline_media_cleanup_gate`;--> statement-breakpoint

CREATE TABLE `_baseline_media_cleanup_candidates` (
	`article_id` text NOT NULL,
	`json_path` text NOT NULL,
	`current_type` text,
	`media_id` text,
	`current_src` text,
	`r2_key` text,
	PRIMARY KEY (`article_id`, `json_path`)
);--> statement-breakpoint

INSERT INTO `_baseline_media_cleanup_candidates` (
	`article_id`, `json_path`, `current_type`, `media_id`, `current_src`, `r2_key`
)
SELECT
	`baseline`.`article_id`,
	`node`.`fullkey`,
	json_extract(`article`.`body_json`, `node`.`fullkey` || '.type'),
	json_extract(`article`.`body_json`, `node`.`fullkey` || '.attrs.mediaId'),
	json_extract(`article`.`body_json`, `node`.`fullkey` || '.attrs.src'),
	`asset`.`r2_key`
FROM `article_baselines` AS `baseline`, json_tree(`baseline`.`body_json`) AS `node`
INNER JOIN `articles` AS `article`
	ON `article`.`id` = `baseline`.`article_id`
LEFT JOIN `media_assets` AS `asset`
	ON `asset`.`id` = json_extract(
		`article`.`body_json`,
		`node`.`fullkey` || '.attrs.mediaId'
	)
WHERE
	`node`.`type` = 'object'
	AND json_extract(`node`.`value`, '$.type') = 'figure'
	AND json_extract(`node`.`value`, '$.attrs.mediaId') IS NULL;--> statement-breakpoint

CREATE TABLE `_baseline_media_cleanup_gate` (
	`mismatch_count` integer NOT NULL CHECK (`mismatch_count` = 0)
);--> statement-breakpoint

INSERT INTO `_baseline_media_cleanup_gate` (`mismatch_count`)
SELECT COUNT(*)
FROM `_baseline_media_cleanup_candidates` AS `candidate`
WHERE
	`candidate`.`current_type` IS NOT 'figure'
	OR `candidate`.`media_id` IS NULL
	OR `candidate`.`current_src` IS NOT '/api/media/' || `candidate`.`media_id`
	OR `candidate`.`r2_key` IS NULL
	OR `candidate`.`r2_key` NOT LIKE 'media/originals/%';--> statement-breakpoint

CREATE TABLE `_baseline_media_cleanup_targets` (
	`article_id` text NOT NULL,
	`json_path` text NOT NULL,
	`media_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY (`article_id`, `position`)
);--> statement-breakpoint

INSERT INTO `_baseline_media_cleanup_targets` (
	`article_id`, `json_path`, `media_id`, `position`
)
SELECT
	`candidate`.`article_id`,
	`candidate`.`json_path`,
	`candidate`.`media_id`,
	row_number() OVER (
		PARTITION BY `candidate`.`article_id`
		ORDER BY `candidate`.`json_path`
	)
FROM `_baseline_media_cleanup_candidates` AS `candidate`;--> statement-breakpoint

CREATE TABLE `_baseline_media_cleanup_documents` (
	`article_id` text PRIMARY KEY NOT NULL,
	`body_json` text NOT NULL
);--> statement-breakpoint

INSERT INTO `_baseline_media_cleanup_documents` (`article_id`, `body_json`)
WITH RECURSIVE `rewrite` (
	`article_id`, `position`, `last_position`, `body_json`
) AS (
	SELECT
		`target`.`article_id`,
		0,
		max(`target`.`position`),
		`baseline`.`body_json`
	FROM `_baseline_media_cleanup_targets` AS `target`
	INNER JOIN `article_baselines` AS `baseline`
		ON `baseline`.`article_id` = `target`.`article_id`
	GROUP BY `target`.`article_id`
	UNION ALL
	SELECT
		`rewrite`.`article_id`,
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
	INNER JOIN `_baseline_media_cleanup_targets` AS `target`
		ON `target`.`article_id` = `rewrite`.`article_id`
		AND `target`.`position` = `rewrite`.`position` + 1
)
SELECT `article_id`, `body_json`
FROM `rewrite`
WHERE `position` = `last_position`;--> statement-breakpoint

UPDATE `article_baselines`
SET `body_json` = (
	SELECT `document`.`body_json`
	FROM `_baseline_media_cleanup_documents` AS `document`
	WHERE `document`.`article_id` = `article_baselines`.`article_id`
)
WHERE EXISTS (
	SELECT 1
	FROM `_baseline_media_cleanup_documents` AS `document`
	WHERE `document`.`article_id` = `article_baselines`.`article_id`
);--> statement-breakpoint

DELETE FROM `_baseline_media_cleanup_gate`;--> statement-breakpoint
INSERT INTO `_baseline_media_cleanup_gate` (`mismatch_count`)
SELECT COUNT(*)
FROM `_baseline_media_cleanup_targets` AS `target`
INNER JOIN `article_baselines` AS `baseline`
	ON `baseline`.`article_id` = `target`.`article_id`
WHERE
	json_extract(
		`baseline`.`body_json`,
		`target`.`json_path` || '.attrs.mediaId'
	) IS NOT `target`.`media_id`
	OR json_extract(
		`baseline`.`body_json`,
		`target`.`json_path` || '.attrs.src'
	) IS NOT '/api/media/' || `target`.`media_id`;--> statement-breakpoint

DELETE FROM `_baseline_media_cleanup_gate`;--> statement-breakpoint
INSERT INTO `_baseline_media_cleanup_gate` (`mismatch_count`)
SELECT COUNT(*)
FROM `article_baselines` AS `baseline`, json_tree(`baseline`.`body_json`) AS `node`
WHERE
	`node`.`type` = 'object'
	AND json_extract(`node`.`value`, '$.type') = 'figure'
	AND json_extract(`node`.`value`, '$.attrs.mediaId') IS NULL;--> statement-breakpoint

DROP TABLE `_baseline_media_cleanup_gate`;--> statement-breakpoint
DROP TABLE `_baseline_media_cleanup_documents`;--> statement-breakpoint
DROP TABLE `_baseline_media_cleanup_targets`;--> statement-breakpoint
DROP TABLE `_baseline_media_cleanup_candidates`;
