CREATE TABLE `translation_runs` (
	`character_count` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`error` text,
	`id` text PRIMARY KEY NOT NULL,
	`model` text NOT NULL,
	`provider` text NOT NULL,
	`source_article_id` text NOT NULL,
	`source_hash` text NOT NULL,
	`source_language` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`target_article_id` text,
	`target_language` text NOT NULL,
	FOREIGN KEY (`source_article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `translation_runs_source_idx` ON `translation_runs` (`source_article_id`,`target_language`,`created_at`);--> statement-breakpoint
CREATE INDEX `translation_runs_status_idx` ON `translation_runs` (`status`,`created_at`);--> statement-breakpoint
ALTER TABLE `articles` ADD `translation_review_status` text DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `translation_reviewed_at` integer;--> statement-breakpoint
ALTER TABLE `articles` ADD `translation_reviewed_by` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `translation_source_article_id` text REFERENCES articles(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `articles` ADD `translation_source_hash` text;
