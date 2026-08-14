WITH `ranked_translation_targets` AS (
	SELECT
		`run`.*,
		row_number() OVER (
			PARTITION BY `run`.`target_article_id`
			ORDER BY
				coalesce(`run`.`completed_at`, `run`.`created_at`) DESC,
				`run`.`created_at` DESC,
				`run`.`id` DESC
		) AS `authority_rank`
	FROM `translation_runs` AS `run`
	WHERE
		`run`.`status` = 'completed'
		AND `run`.`target_article_id` IS NOT NULL
)
INSERT INTO `article_baselines` (
	`article_id`,
	`title`,
	`summary`,
	`body_json`,
	`source_hash`,
	`converter_version`,
	`created_at`
)
SELECT
	`target`.`id`,
	`source`.`title`,
	`source`.`summary`,
	`source`.`body_json`,
	`authority`.`source_hash`,
	'translation-v1',
	coalesce(
		`authority`.`completed_at`,
		`authority`.`created_at`,
		`target`.`created_at`
	)
FROM `ranked_translation_targets` AS `authority`
INNER JOIN `articles` AS `target`
	ON `target`.`id` = `authority`.`target_article_id`
INNER JOIN `articles` AS `source`
	ON `source`.`id` = `authority`.`source_article_id`
WHERE
	`authority`.`authority_rank` = 1
	AND `target`.`translation_source_article_id` = `source`.`id`
	AND `target`.`language` = `authority`.`target_language`
	AND `source`.`language` = `authority`.`source_language`
	AND `source`.`language` = 'lt'
	AND `target`.`language` <> 'lt'
	AND NOT EXISTS (
		SELECT 1
		FROM `article_baselines` AS `existing_baseline`
		WHERE `existing_baseline`.`article_id` = `target`.`id`
	);
--> statement-breakpoint
WITH `ranked_translation_targets` AS (
	SELECT
		`run`.*,
		row_number() OVER (
			PARTITION BY `run`.`target_article_id`
			ORDER BY
				coalesce(`run`.`completed_at`, `run`.`created_at`) DESC,
				`run`.`created_at` DESC,
				`run`.`id` DESC
		) AS `authority_rank`
	FROM `translation_runs` AS `run`
	WHERE
		`run`.`status` = 'completed'
		AND `run`.`target_article_id` IS NOT NULL
)
INSERT INTO `article_revisions` (
	`id`,
	`article_id`,
	`editor_id`,
	`version`,
	`body_json`,
	`metadata_json`,
	`created_at`
)
SELECT
	'translation-readiness-v1:' || `target`.`id`,
	`target`.`id`,
	'system:translation-readiness-v1',
	1,
	`target`.`body_json`,
	json_object(
		'heroFit', `target`.`hero_fit`,
		'heroFocalX', `target`.`hero_focal_x`,
		'heroFocalY', `target`.`hero_focal_y`,
		'heroMediaId', `target`.`hero_media_id`,
		'labels', CASE
			WHEN json_valid(`target`.`labels_json`) THEN json(`target`.`labels_json`)
			ELSE json_array()
		END,
		'language', `target`.`language`,
		'publishedAt', `target`.`published_at`,
		'section', `target`.`section`,
		'seoDescription', `target`.`seo_description`,
		'seoTitle', `target`.`seo_title`,
		'slug', `target`.`slug`,
		'snapshotCompleteness', 'complete',
		'snapshotVersion', 3,
		'sourceArticleId', `target`.`source_article_id`,
		'sourceCapture', `target`.`source_capture`,
		'sourceUrl', `target`.`source_url`,
		'status', `target`.`status`,
		'summary', `target`.`summary`,
		'title', `target`.`title`,
		'translationKind', `target`.`translation_kind`,
		'translationReviewedAt', `target`.`translation_reviewed_at`,
		'translationReviewedBy', `target`.`translation_reviewed_by`,
		'translationReviewStatus', `target`.`translation_review_status`,
		'translationSourceArticleId', `target`.`translation_source_article_id`,
		'translationSourceHash', `target`.`translation_source_hash`
	),
	coalesce(
		`authority`.`completed_at`,
		`authority`.`created_at`,
		`target`.`created_at`
	)
FROM `ranked_translation_targets` AS `authority`
INNER JOIN `articles` AS `target`
	ON `target`.`id` = `authority`.`target_article_id`
INNER JOIN `articles` AS `source`
	ON `source`.`id` = `authority`.`source_article_id`
WHERE
	`authority`.`authority_rank` = 1
	AND `target`.`translation_source_article_id` = `source`.`id`
	AND `target`.`language` = `authority`.`target_language`
	AND `source`.`language` = `authority`.`source_language`
	AND `source`.`language` = 'lt'
	AND `target`.`language` <> 'lt'
	AND NOT EXISTS (
		SELECT 1
		FROM `article_revisions` AS `existing_revision`
		WHERE `existing_revision`.`article_id` = `target`.`id`
	);
