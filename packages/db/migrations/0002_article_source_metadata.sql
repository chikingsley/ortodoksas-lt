ALTER TABLE `articles` ADD `kind` text DEFAULT 'article' NOT NULL;
--> statement-breakpoint
ALTER TABLE `articles` ADD `labels_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `articles` ADD `section` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `articles` ADD `source_capture` text;
--> statement-breakpoint
ALTER TABLE `articles` ADD `source_html` text;
--> statement-breakpoint
ALTER TABLE `articles` ADD `source_url` text;
