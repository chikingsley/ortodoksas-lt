CREATE TABLE `homepage_layout_state` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `homepage_placements` ADD `layout_revision` text DEFAULT 'initial' NOT NULL;--> statement-breakpoint
CREATE INDEX `homepage_placements_layout_revision_idx` ON `homepage_placements` (`layout_revision`);
--> statement-breakpoint
INSERT INTO `homepage_layout_state` (`id`, `revision`, `updated_at`)
VALUES ('primary', 'initial', unixepoch() * 1000);
--> statement-breakpoint
UPDATE `article_revisions` AS `revision`
SET `metadata_json` = json_patch(
	json_object(
		'snapshotVersion', 2,
		'heroFit', `article`.`hero_fit`,
		'heroFocalX', `article`.`hero_focal_x`,
		'heroFocalY', `article`.`hero_focal_y`,
		'heroMediaId', `article`.`hero_media_id`,
		'kind', `article`.`kind`,
		'labels', json(`article`.`labels_json`),
		'language', `article`.`language`,
		'publishedAt', `article`.`published_at`,
		'section', `article`.`section`,
		'seoDescription', `article`.`seo_description`,
		'seoTitle', `article`.`seo_title`,
		'slug', `article`.`slug`,
		'sourceArticleId', `article`.`source_article_id`,
		'sourceCapture', `article`.`source_capture`,
		'sourceUrl', `article`.`source_url`,
		'status', `article`.`status`,
		'summary', `article`.`summary`,
		'title', `article`.`title`,
		'translationGroupId', `article`.`translation_group_id`,
		'translationKind', `article`.`translation_kind`,
		'translationReviewedAt', `article`.`translation_reviewed_at`,
		'translationReviewedBy', `article`.`translation_reviewed_by`,
		'translationReviewStatus', `article`.`translation_review_status`,
		'translationSourceArticleId', `article`.`translation_source_article_id`,
		'translationSourceHash', `article`.`translation_source_hash`
	),
	`revision`.`metadata_json`
)
FROM `articles` AS `article`
WHERE `revision`.`article_id` = `article`.`id`
	AND coalesce(json_extract(`revision`.`metadata_json`, '$.snapshotVersion'), 0) < 2;
