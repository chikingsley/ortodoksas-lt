PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_articles` (
	`body_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`hero_fit` text DEFAULT 'cover' NOT NULL,
	`hero_focal_x` integer DEFAULT 50 NOT NULL,
	`hero_focal_y` integer DEFAULT 50 NOT NULL,
	`hero_media_id` text,
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'article' NOT NULL,
	`labels_json` text DEFAULT '[]' NOT NULL,
	`language` text NOT NULL,
	`published_at` integer,
	`section` text DEFAULT '' NOT NULL,
	`seo_description` text,
	`seo_title` text,
	`slug` text NOT NULL,
	`source_article_id` text,
	`source_capture` text,
	`source_html` text,
	`source_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`translation_group_id` text NOT NULL,
	`translation_kind` text DEFAULT 'original' NOT NULL,
	`translation_reviewed_at` integer,
	`translation_reviewed_by` text,
	`translation_review_status` text DEFAULT 'not_required' NOT NULL,
	`translation_source_article_id` text,
	`translation_source_hash` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`hero_media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`translation_group_id`) REFERENCES `publication_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`translation_source_article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_articles`("body_json", "created_at", "hero_fit", "hero_focal_x", "hero_focal_y", "hero_media_id", "id", "kind", "labels_json", "language", "published_at", "section", "seo_description", "seo_title", "slug", "source_article_id", "source_capture", "source_html", "source_url", "status", "summary", "title", "translation_group_id", "translation_kind", "translation_reviewed_at", "translation_reviewed_by", "translation_review_status", "translation_source_article_id", "translation_source_hash", "updated_at") SELECT "body_json", "created_at", "hero_fit", "hero_focal_x", "hero_focal_y", "hero_media_id", "id", "kind", "labels_json", "language", "published_at", "section", "seo_description", "seo_title", "slug", "source_article_id", "source_capture", "source_html", "source_url", "status", "summary", "title", "translation_group_id", "translation_kind", "translation_reviewed_at", "translation_reviewed_by", "translation_review_status", "translation_source_article_id", "translation_source_hash", "updated_at" FROM `articles`;--> statement-breakpoint
DROP TABLE `articles`;--> statement-breakpoint
ALTER TABLE `__new_articles` RENAME TO `articles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `articles_language_slug_unique` ON `articles` (`language`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `articles_translation_group_language_unique` ON `articles` (`translation_group_id`,`language`);--> statement-breakpoint
CREATE INDEX `articles_status_updated_idx` ON `articles` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `articles_translation_group_idx` ON `articles` (`translation_group_id`);