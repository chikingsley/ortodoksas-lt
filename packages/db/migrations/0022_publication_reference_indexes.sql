CREATE INDEX `articles_translation_source_idx` ON `articles` (`translation_source_article_id`);--> statement-breakpoint
CREATE INDEX `articles_hero_media_idx` ON `articles` (`hero_media_id`);--> statement-breakpoint
CREATE INDEX `homepage_placements_article_idx` ON `homepage_placements` (`article_id`);--> statement-breakpoint
CREATE INDEX `translation_runs_target_idx` ON `translation_runs` (`target_article_id`);