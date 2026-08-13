CREATE UNIQUE INDEX `articles_translation_group_language_unique`
ON `articles` (`translation_group_id`, `language`);
