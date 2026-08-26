ALTER TABLE `articles` ADD `byline` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `byline_type` text DEFAULT 'person' NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `byline_url` text;