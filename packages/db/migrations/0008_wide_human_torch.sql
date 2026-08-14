CREATE TABLE `communities` (
	`address_line` text DEFAULT '' NOT NULL,
	`country_code` text DEFAULT 'LT' NOT NULL,
	`created_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`latitude` real,
	`locality` text DEFAULT '' NOT NULL,
	`longitude` real,
	`postal_code` text DEFAULT '' NOT NULL,
	`operational_status` text DEFAULT 'active' NOT NULL,
	`slug` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`type` text DEFAULT 'community' NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "communities_status_check" CHECK("communities"."status" IN ('draft', 'published', 'archived')),
	CONSTRAINT "communities_type_check" CHECK("communities"."type" IN ('parish', 'church', 'chapel', 'mission', 'monastery', 'community')),
	CONSTRAINT "communities_operational_status_check" CHECK("communities"."operational_status" IN ('active', 'forming', 'inactive')),
	CONSTRAINT "communities_sort_order_check" CHECK("communities"."sort_order" >= 0),
	CONSTRAINT "communities_coordinates_check" CHECK(("communities"."latitude" IS NULL AND "communities"."longitude" IS NULL) OR ("communities"."latitude" IS NOT NULL AND "communities"."longitude" IS NOT NULL)),
	CONSTRAINT "communities_latitude_check" CHECK("communities"."latitude" IS NULL OR ("communities"."latitude" >= -90 AND "communities"."latitude" <= 90)),
	CONSTRAINT "communities_longitude_check" CHECK("communities"."longitude" IS NULL OR ("communities"."longitude" >= -180 AND "communities"."longitude" <= 180)),
	CONSTRAINT "communities_country_code_check" CHECK(length("communities"."country_code") = 2 AND "communities"."country_code" = upper("communities"."country_code"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `communities_slug_unique` ON `communities` (`slug`);--> statement-breakpoint
CREATE INDEX `communities_status_sort_idx` ON `communities` (`status`,`sort_order`);--> statement-breakpoint
CREATE TABLE `community_contact_localizations` (
	`community_contact_id` text NOT NULL,
	`label` text NOT NULL,
	`language` text NOT NULL,
	PRIMARY KEY(`community_contact_id`, `language`),
	FOREIGN KEY (`community_contact_id`) REFERENCES `community_contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "community_contact_localizations_language_check" CHECK("community_contact_localizations"."language" IN ('lt', 'en', 'ru', 'uk', 'be'))
);
--> statement-breakpoint
CREATE TABLE `community_contacts` (
	`community_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`href` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "community_contacts_kind_check" CHECK("community_contacts"."kind" IN ('email', 'phone', 'website', 'facebook', 'instagram', 'telegram', 'other')),
	CONSTRAINT "community_contacts_sort_order_check" CHECK("community_contacts"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE INDEX `community_contacts_community_sort_idx` ON `community_contacts` (`community_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `community_localizations` (
	`accessibility` text DEFAULT '' NOT NULL,
	`address_label` text DEFAULT '' NOT NULL,
	`community_id` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`directions` text DEFAULT '' NOT NULL,
	`language` text NOT NULL,
	`name` text NOT NULL,
	`operational_notice` text DEFAULT '' NOT NULL,
	`seo_description` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`community_id`, `language`),
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "community_localizations_language_check" CHECK("community_localizations"."language" IN ('lt', 'en', 'ru', 'uk', 'be'))
);
--> statement-breakpoint
CREATE TABLE `community_media` (
	`community_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`media_id` text NOT NULL,
	`role` text DEFAULT 'gallery' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "community_media_role_check" CHECK("community_media"."role" IN ('primary', 'gallery')),
	CONSTRAINT "community_media_sort_order_check" CHECK("community_media"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_media_community_media_unique` ON `community_media` (`community_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `community_media_community_sort_idx` ON `community_media` (`community_id`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `community_media_one_primary_unique` ON `community_media` (`community_id`) WHERE "community_media"."role" = 'primary';--> statement-breakpoint
CREATE TABLE `community_media_localizations` (
	`alt_text` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`community_media_id` text NOT NULL,
	`language` text NOT NULL,
	PRIMARY KEY(`community_media_id`, `language`),
	FOREIGN KEY (`community_media_id`) REFERENCES `community_media`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "community_media_localizations_language_check" CHECK("community_media_localizations"."language" IN ('lt', 'en', 'ru', 'uk', 'be'))
);
--> statement-breakpoint
CREATE TABLE `community_service_localizations` (
	`community_service_id` text NOT NULL,
	`language` text NOT NULL,
	`schedule_text` text NOT NULL,
	PRIMARY KEY(`community_service_id`, `language`),
	FOREIGN KEY (`community_service_id`) REFERENCES `community_services`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "community_service_localizations_language_check" CHECK("community_service_localizations"."language" IN ('lt', 'en', 'ru', 'uk', 'be'))
);
--> statement-breakpoint
CREATE TABLE `community_services` (
	`community_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`ends_at` integer,
	`id` text PRIMARY KEY NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`starts_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "community_services_sort_order_check" CHECK("community_services"."sort_order" >= 0),
	CONSTRAINT "community_services_dates_check" CHECK("community_services"."starts_at" IS NULL OR "community_services"."ends_at" IS NULL OR "community_services"."starts_at" <= "community_services"."ends_at")
);
--> statement-breakpoint
CREATE INDEX `community_services_community_sort_idx` ON `community_services` (`community_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `people` (
	`created_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "people_status_check" CHECK("people"."status" IN ('draft', 'published', 'archived')),
	CONSTRAINT "people_sort_order_check" CHECK("people"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_slug_unique` ON `people` (`slug`);--> statement-breakpoint
CREATE INDEX `people_status_sort_idx` ON `people` (`status`,`sort_order`);--> statement-breakpoint
CREATE TABLE `person_contact_localizations` (
	`label` text NOT NULL,
	`language` text NOT NULL,
	`person_contact_id` text NOT NULL,
	PRIMARY KEY(`person_contact_id`, `language`),
	FOREIGN KEY (`person_contact_id`) REFERENCES `person_contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "person_contact_localizations_language_check" CHECK("person_contact_localizations"."language" IN ('lt', 'en', 'ru', 'uk', 'be'))
);
--> statement-breakpoint
CREATE TABLE `person_contacts` (
	`created_at` integer NOT NULL,
	`href` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`person_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "person_contacts_kind_check" CHECK("person_contacts"."kind" IN ('email', 'phone', 'website', 'facebook', 'instagram', 'telegram', 'other')),
	CONSTRAINT "person_contacts_sort_order_check" CHECK("person_contacts"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE INDEX `person_contacts_person_sort_idx` ON `person_contacts` (`person_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `person_localizations` (
	`biography_json` text NOT NULL,
	`display_name` text NOT NULL,
	`language` text NOT NULL,
	`person_id` text NOT NULL,
	`seo_description` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`person_id`, `language`),
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "person_localizations_language_check" CHECK("person_localizations"."language" IN ('lt', 'en', 'ru', 'uk', 'be'))
);
--> statement-breakpoint
CREATE TABLE `person_media` (
	`created_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`media_id` text NOT NULL,
	`person_id` text NOT NULL,
	`role` text DEFAULT 'gallery' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "person_media_role_check" CHECK("person_media"."role" IN ('primary', 'gallery')),
	CONSTRAINT "person_media_sort_order_check" CHECK("person_media"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `person_media_person_media_unique` ON `person_media` (`person_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `person_media_person_sort_idx` ON `person_media` (`person_id`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `person_media_one_primary_unique` ON `person_media` (`person_id`) WHERE "person_media"."role" = 'primary';--> statement-breakpoint
CREATE TABLE `person_media_localizations` (
	`alt_text` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`language` text NOT NULL,
	`person_media_id` text NOT NULL,
	PRIMARY KEY(`person_media_id`, `language`),
	FOREIGN KEY (`person_media_id`) REFERENCES `person_media`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "person_media_localizations_language_check" CHECK("person_media_localizations"."language" IN ('lt', 'en', 'ru', 'uk', 'be'))
);
--> statement-breakpoint
CREATE TABLE `person_position_localizations` (
	`description` text DEFAULT '' NOT NULL,
	`language` text NOT NULL,
	`position_id` text NOT NULL,
	`title` text NOT NULL,
	PRIMARY KEY(`position_id`, `language`),
	FOREIGN KEY (`position_id`) REFERENCES `person_positions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "person_position_localizations_language_check" CHECK("person_position_localizations"."language" IN ('lt', 'en', 'ru', 'uk', 'be'))
);
--> statement-breakpoint
CREATE TABLE `person_positions` (
	`community_id` text,
	`created_at` integer NOT NULL,
	`ends_at` integer,
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`role_key` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`starts_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "person_positions_sort_order_check" CHECK("person_positions"."sort_order" >= 0),
	CONSTRAINT "person_positions_dates_check" CHECK("person_positions"."starts_at" IS NULL OR "person_positions"."ends_at" IS NULL OR "person_positions"."starts_at" <= "person_positions"."ends_at")
);
--> statement-breakpoint
CREATE INDEX `person_positions_person_sort_idx` ON `person_positions` (`person_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `person_positions_community_idx` ON `person_positions` (`community_id`);--> statement-breakpoint
CREATE TABLE `publication_groups` (
	`created_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`page_template` text DEFAULT 'standard' NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "publication_groups_kind_check" CHECK("publication_groups"."kind" IN ('article', 'page')),
	CONSTRAINT "publication_groups_page_template_check" CHECK("publication_groups"."page_template" IN ('standard', 'calendar', 'people_directory', 'community_directory', 'contact', 'library', 'support')),
	CONSTRAINT "publication_groups_kind_template_check" CHECK("publication_groups"."kind" = 'page' OR "publication_groups"."page_template" = 'standard')
);
--> statement-breakpoint
INSERT INTO `publication_groups` (`created_at`, `id`, `kind`, `page_template`, `updated_at`)
SELECT
	MIN(`created_at`),
	`translation_group_id`,
	`kind`,
	CASE `translation_group_id`
		WHEN '1cef25a2-d6bc-4a35-b09f-2da96ca841bf' THEN 'calendar'
		WHEN 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f' THEN 'people_directory'
		WHEN 'b7e18d0e-ddd5-49ed-9590-253666cf2d3f' THEN 'community_directory'
		WHEN 'd049617c-00d0-4aff-860f-78dc8e513c9e' THEN 'contact'
		WHEN 'a1e2f5f6-c7f5-4b6a-93ba-125dade2f7d2' THEN 'library'
		WHEN 'fe5459d1-9bc6-4db7-81c5-0919c02581ab' THEN 'support'
		ELSE 'standard'
	END,
	MAX(`updated_at`)
FROM `articles`
GROUP BY `translation_group_id`, `kind`;
--> statement-breakpoint
WITH `profile_map` (`person_id`, `slug`, `sort_order`, `figure_index`, `name_index`, `bio_start`, `bio_end`, `contact_index`) AS (
	VALUES
		('person-panaretos', 'panaretos', 0, 1, 2, 3, 2, NULL),
		('person-vitalijus-mockus', 'vitalijus-mockus', 1, 4, 6, 7, 7, 8),
		('person-vladimiras-seliavko', 'vladimiras-seliavko', 2, 10, 11, 12, 12, 13),
		('person-georgy-roy', 'georgy-roy', 3, 15, 16, 17, 17, 18),
		('person-georgy-ananiev', 'georgy-ananiev', 4, 20, 21, 22, 22, 23),
		('person-aliaksandr-kukhta', 'aliaksandr-kukhta', 5, 25, 26, 27, 27, 28),
		('person-gintaras-sungaila', 'gintaras-jurgis-sungaila', 6, 29, 31, 32, 32, 33),
		('person-jeremiah-yurchenko', 'jeremiah-yurchenko', 7, 35, 36, 37, 37, 38),
		('person-viktoras-miniotas', 'viktoras-miniotas', 8, 40, 41, 42, 41, 42),
		('person-andrey-kuraev', 'andrey-kuraev', 9, 44, 45, 46, 47, NULL),
		('person-ioann-ovchinnikov', 'ioann-ovchinnikov', 10, 49, 50, 51, 51, 52),
		('person-platon-konishchev', 'platon-konishchev', 11, 54, 55, 56, 56, 57)
)
INSERT INTO `people` (`created_at`, `id`, `slug`, `sort_order`, `status`, `updated_at`)
SELECT MIN(`articles`.`created_at`), `profile_map`.`person_id`, `profile_map`.`slug`, `profile_map`.`sort_order`, 'published', MAX(`articles`.`updated_at`)
FROM `profile_map`
JOIN `articles` ON `articles`.`translation_group_id` = 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f'
GROUP BY `profile_map`.`person_id`;
--> statement-breakpoint
WITH `profile_map` (`person_id`, `figure_index`, `name_index`, `bio_start`, `bio_end`) AS (
	VALUES
		('person-panaretos', 1, 2, 3, 2),
		('person-vitalijus-mockus', 4, 6, 7, 7),
		('person-vladimiras-seliavko', 10, 11, 12, 12),
		('person-georgy-roy', 15, 16, 17, 17),
		('person-georgy-ananiev', 20, 21, 22, 22),
		('person-aliaksandr-kukhta', 25, 26, 27, 27),
		('person-gintaras-sungaila', 29, 31, 32, 32),
		('person-jeremiah-yurchenko', 35, 36, 37, 37),
		('person-viktoras-miniotas', 40, 41, 42, 41),
		('person-andrey-kuraev', 44, 45, 46, 47),
		('person-ioann-ovchinnikov', 49, 50, 51, 51),
		('person-platon-konishchev', 54, 55, 56, 56)
)
INSERT INTO `person_localizations` (`biography_json`, `display_name`, `language`, `person_id`, `seo_description`)
SELECT
	json_object(
		'type', 'doc',
		'content', json(COALESCE((
			SELECT json_group_array(json(`ordered_blocks`.`block`))
			FROM (
				SELECT json_remove(json_extract(`articles`.`body_json`, '$.content[' || `profile_map`.`name_index` || ']'), '$.content[0]') AS `block`, `profile_map`.`name_index` AS `block_order`
				WHERE json_array_length(json_extract(`articles`.`body_json`, '$.content[' || `profile_map`.`name_index` || '].content')) > 1
				UNION ALL
				SELECT `block`.`value` AS `block`, CAST(`block`.`key` AS integer) AS `block_order`
				FROM json_each(`articles`.`body_json`, '$.content') AS `block`
				WHERE CAST(`block`.`key` AS integer) BETWEEN `profile_map`.`bio_start` AND `profile_map`.`bio_end`
				ORDER BY `block_order`
			) AS `ordered_blocks`
		), '[]'))
	),
	COALESCE((
		SELECT `name_text`.`value`
		FROM json_tree(json_extract(`articles`.`body_json`, '$.content[' || `profile_map`.`name_index` || ']')) AS `name_text`
		WHERE `name_text`.`key` = 'text'
		ORDER BY `name_text`.`id`
		LIMIT 1
	), ''),
	`articles`.`language`,
	`profile_map`.`person_id`,
	''
FROM `articles`
JOIN `profile_map`
WHERE `articles`.`translation_group_id` = 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f';
--> statement-breakpoint
INSERT INTO `communities` (`address_line`, `country_code`, `created_at`, `id`, `latitude`, `locality`, `longitude`, `postal_code`, `operational_status`, `slug`, `sort_order`, `status`, `type`, `updated_at`)
VALUES
	('Verkių g. 70', 'LT', unixepoch() * 1000, 'community-vilnius-trinity', NULL, 'Vilnius', NULL, '', 'active', 'vilnius-holy-trinity', 0, 'published', 'church', unixepoch() * 1000),
	('Lukiškių skg. 6', 'LT', unixepoch() * 1000, 'community-vilnius-nicholas', NULL, 'Vilnius', NULL, '', 'active', 'vilnius-st-nicholas', 1, 'published', 'church', unixepoch() * 1000),
	('Bokšto g. 4', 'LT', unixepoch() * 1000, 'community-vilnius-annunciation', NULL, 'Vilnius', NULL, '', 'active', 'vilnius-annunciation', 2, 'published', 'community', unixepoch() * 1000),
	('Aukštaičių g. 6', 'LT', unixepoch() * 1000, 'community-kaunas-resurrection', NULL, 'Kaunas', NULL, '', 'active', 'kaunas-resurrection', 3, 'published', 'community', unixepoch() * 1000),
	('Herkaus Manto g. 84', 'LT', unixepoch() * 1000, 'community-klaipeda-george', NULL, 'Klaipėda', NULL, '', 'active', 'klaipeda-st-george', 4, 'published', 'chapel', unixepoch() * 1000),
	('Kražių g. 17', 'LT', unixepoch() * 1000, 'community-siauliai-george', NULL, 'Šiauliai', NULL, '', 'active', 'siauliai-st-george', 5, 'published', 'church', unixepoch() * 1000),
	('Gintaro g. 32', 'LT', unixepoch() * 1000, 'community-taurage', NULL, 'Tauragė', NULL, '', 'active', 'taurage', 6, 'published', 'community', unixepoch() * 1000),
	('A. Vienuolio g. 2', 'LT', unixepoch() * 1000, 'community-anyksciai', NULL, 'Anykščiai', NULL, '', 'active', 'anyksciai', 7, 'published', 'community', unixepoch() * 1000),
	('', 'LT', unixepoch() * 1000, 'community-elektrenai', NULL, 'Elektrėnai', NULL, '', 'forming', 'elektrenai', 8, 'published', 'community', unixepoch() * 1000);
--> statement-breakpoint
INSERT INTO `community_localizations` (`accessibility`, `address_label`, `community_id`, `description`, `directions`, `language`, `name`, `operational_notice`, `seo_description`)
VALUES
	('', 'Švč. Trejybės (Trinapolio) bažnyčia, Verkių g. 70, Vilnius', 'community-vilnius-trinity', '', '', 'lt', 'Vilniaus Švč. Trejybės bendruomenė', '', ''),
	('', 'Holy Trinity (Trinapolis) Church, Verkių St. 70, Vilnius', 'community-vilnius-trinity', '', '', 'en', 'Vilnius Holy Trinity Community', '', ''),
	('', 'Храм Пресвятой Троицы (Тринаполис), ул. Вяркю, 70, Вильнюс', 'community-vilnius-trinity', '', '', 'ru', 'Вильнюсская община Пресвятой Троицы', '', ''),
	('', 'Храм Пресвятої Трійці (Трінаполіс), вул. Вяркю, 70, Вільнюс', 'community-vilnius-trinity', '', '', 'uk', 'Вільнюська громада Пресвятої Трійці', '', ''),
	('', 'Царква Найсвяцейшай Тройцы (Трынаполіс), вул. Вяркю, 70, Вільнюс', 'community-vilnius-trinity', '', '', 'be', 'Віленская супольнасць Найсвяцейшай Тройцы', '', ''),
	('', 'Šv. Mikalojaus bažnyčia, Lukiškių skg. 6, Vilnius', 'community-vilnius-nicholas', '', '', 'lt', 'Vilniaus Šv. Mikalojaus bendruomenė', '', ''),
	('', 'St Nicholas Church, Lukiškių Lane 6, Vilnius', 'community-vilnius-nicholas', '', '', 'en', 'Vilnius St Nicholas Community', '', ''),
	('', 'Храм Святителя Николая, пер. Лукишкю, 6, Вильнюс', 'community-vilnius-nicholas', '', '', 'ru', 'Вильнюсская община Святителя Николая', '', ''),
	('', 'Храм Святителя Миколая, пров. Лукішкю, 6, Вільнюс', 'community-vilnius-nicholas', '', '', 'uk', 'Вільнюська громада Святителя Миколая', '', ''),
	('', 'Царква Свяціцеля Мікалая, зав. Лукішкю, 6, Вільнюс', 'community-vilnius-nicholas', '', '', 'be', 'Віленская супольнасць Свяціцеля Мікалая', '', ''),
	('', 'Bokšto g. 4, Vilnius', 'community-vilnius-annunciation', '', '', 'lt', 'Vilniaus Apreiškimo Švč. Dievo Gimdytojai bendruomenė', '', ''),
	('', 'Bokšto St. 4, Vilnius', 'community-vilnius-annunciation', '', '', 'en', 'Vilnius Annunciation Community', '', ''),
	('', 'ул. Бокшто, 4, Вильнюс', 'community-vilnius-annunciation', '', '', 'ru', 'Вильнюсская община Благовещения Пресвятой Богородицы', '', ''),
	('', 'вул. Бокшто, 4, Вільнюс', 'community-vilnius-annunciation', '', '', 'uk', 'Вільнюська громада Благовіщення Пресвятої Богородиці', '', ''),
	('', 'вул. Бокшто, 4, Вільнюс', 'community-vilnius-annunciation', '', '', 'be', 'Віленская супольнасць Дабравешчання Найсвяцейшай Багародзіцы', '', ''),
	('', 'Mažoji Kristaus Prisikėlimo bažnyčia, Aukštaičių g. 6, Kaunas', 'community-kaunas-resurrection', '', '', 'lt', 'Kauno Kristaus Prisikėlimo bendruomenė', '', ''),
	('', 'Little Church of the Resurrection of Christ, Aukštaičių St. 6, Kaunas', 'community-kaunas-resurrection', '', '', 'en', 'Kaunas Resurrection of Christ Community', '', ''),
	('', 'Малая церковь Воскресения Христова, ул. Аукштайчю, 6, Каунас', 'community-kaunas-resurrection', '', '', 'ru', 'Каунасская община Воскресения Христова', '', ''),
	('', 'Мала церква Воскресіння Христового, вул. Аукштайчю, 6, Каунас', 'community-kaunas-resurrection', '', '', 'uk', 'Каунаська громада Воскресіння Христового', '', ''),
	('', 'Малая царква Уваскрасення Хрыстова, вул. Аўкштайчю, 6, Каўнас', 'community-kaunas-resurrection', '', '', 'be', 'Каўнаская супольнасць Уваскрасення Хрыстова', '', ''),
	('', 'Klaipėdos universiteto koplyčia, Herkaus Manto g. 84, Klaipėda', 'community-klaipeda-george', '', '', 'lt', 'Klaipėdos Šv. Jurgio bendruomenė', '', ''),
	('', 'Klaipėda University Chapel, Herkaus Manto St. 84, Klaipėda', 'community-klaipeda-george', '', '', 'en', 'Klaipėda St George Community', '', ''),
	('', 'Часовня Клайпедского университета, ул. Херкаус Манто, 84, Клайпеда', 'community-klaipeda-george', '', '', 'ru', 'Клайпедская община Святого Георгия', '', ''),
	('', 'Каплиця Клайпедського університету, вул. Геркаус Манто, 84, Клайпеда', 'community-klaipeda-george', '', '', 'uk', 'Клайпедська громада Святого Георгія', '', ''),
	('', 'Капліца Клайпедскага ўніверсітэта, вул. Геркаус Манта, 84, Клайпеда', 'community-klaipeda-george', '', '', 'be', 'Клайпедская супольнасць Святога Георгія', '', ''),
	('', 'Šv. Jurgio bažnyčia, Kražių g. 17, Šiauliai', 'community-siauliai-george', '', '', 'lt', 'Šiaulių Šv. Jurgio bendruomenė', '', ''),
	('', 'St George Church, Kražių St. 17, Šiauliai', 'community-siauliai-george', '', '', 'en', 'Šiauliai St George Community', '', ''),
	('', 'Храм Святого Георгия, ул. Кражю, 17, Шяуляй', 'community-siauliai-george', '', '', 'ru', 'Шяуляйская община Святого Георгия', '', ''),
	('', 'Храм Святого Георгія, вул. Кражю, 17, Шяуляй', 'community-siauliai-george', '', '', 'uk', 'Шяуляйська громада Святого Георгія', '', ''),
	('', 'Царква Святога Георгія, вул. Кражу, 17, Шаўляй', 'community-siauliai-george', '', '', 'be', 'Шаўляйская супольнасць Святога Георгія', '', ''),
	('', 'Parapijos namai, Gintaro g. 32, Tauragė', 'community-taurage', '', '', 'lt', 'Tauragės bendruomenė', '', ''),
	('', 'Parish House, Gintaro St. 32, Tauragė', 'community-taurage', '', '', 'en', 'Tauragė Community', '', ''),
	('', 'Приходской дом, ул. Гинтаро, 32, Таураге', 'community-taurage', '', '', 'ru', 'Таурагская община', '', ''),
	('', 'Парафіяльний будинок, вул. Гінтаро, 32, Таураге', 'community-taurage', '', '', 'uk', 'Таурагська громада', '', ''),
	('', 'Парафіяльны дом, вул. Гінтара, 32, Таўраге', 'community-taurage', '', '', 'be', 'Таўрагская супольнасць', '', ''),
	('', 'A. Baranausko ir A. Vienuolio-Žukausko muziejus, A. Vienuolio g. 2, Anykščiai', 'community-anyksciai', '', '', 'lt', 'Anykščių bendruomenė', '', ''),
	('', 'A. Baranauskas and A. Vienuolis-Žukauskas Museum, A. Vienuolio St. 2, Anykščiai', 'community-anyksciai', '', '', 'en', 'Anykščiai Community', '', ''),
	('', 'Музей А. Баранаускаса и А. Венуолиса-Жукаускаса, ул. А. Венуолё, 2, Аникщяй', 'community-anyksciai', '', '', 'ru', 'Аникщяйская община', '', ''),
	('', 'Музей А. Баранаускаса та А. Вєнуоліса-Жукаускаса, вул. А. Вєнуольо, 2, Анікщяй', 'community-anyksciai', '', '', 'uk', 'Анікщяйська громада', '', ''),
	('', 'Музей А. Баранаўскаса і А. Венуоліса-Жукаўскаса, вул. А. Венуолё, 2, Анікшчэй', 'community-anyksciai', '', '', 'be', 'Анікшчэйская супольнасць', '', ''),
	('', '', 'community-elektrenai', '', '', 'lt', 'Elektrėnai', 'Oficialiame pamaldų sąraše ši vieta tebėra pažymėta kaip ruošiama. Dabartinį adresą ir artimiausių pamaldų laiką patvirtina Egzarchato kanceliarija.', ''),
	('', '', 'community-elektrenai', '', '', 'en', 'Elektrėnai', 'The official service list still marks this location as being prepared. The Exarchate office can confirm the current address and the next service time.', ''),
	('', '', 'community-elektrenai', '', '', 'ru', 'Электренай', 'В официальном расписании богослужений это место по-прежнему отмечено как готовящееся. Текущий адрес и время ближайшего богослужения можно уточнить в канцелярии Экзархата.', ''),
	('', '', 'community-elektrenai', '', '', 'uk', 'Електренай', 'В офіційному розкладі богослужінь це місце досі позначене як таке, що готується. Актуальну адресу й час найближчого богослужіння можна уточнити в канцелярії Екзархату.', ''),
	('', '', 'community-elektrenai', '', '', 'be', 'Электрэнай', 'У афіцыйным раскладзе набажэнстваў гэтае месца па-ранейшаму пазначана як тое, што рыхтуецца. Актуальны адрас і час бліжэйшага набажэнства можна ўдакладніць у канцылярыі Экзархата.', '');
--> statement-breakpoint
WITH `contact_map` (`id`, `community_id`, `href`, `kind`, `sort_order`, `label`) AS (
	VALUES
		('contact-vilnius-trinity-web', 'community-vilnius-trinity', 'https://www.trejybe.lt/', 'website', 0, 'Trejybe.lt'),
		('contact-vilnius-trinity-facebook', 'community-vilnius-trinity', 'https://www.facebook.com/groups/ortodoksaitrinapolyje', 'facebook', 1, 'Facebook'),
		('contact-vilnius-trinity-instagram', 'community-vilnius-trinity', 'https://www.instagram.com/vilnius_trejybe/', 'instagram', 2, 'Instagram'),
		('contact-vilnius-nicholas-facebook', 'community-vilnius-nicholas', 'https://www.facebook.com/groups/ortodoksailukiskese', 'facebook', 0, 'Facebook'),
		('contact-vilnius-annunciation-facebook', 'community-vilnius-annunciation', 'https://www.facebook.com/groups/3431985900407940', 'facebook', 0, 'Facebook'),
		('contact-vilnius-annunciation-telegram', 'community-vilnius-annunciation', 'https://t.me/ortovilnya', 'telegram', 1, 'Telegram'),
		('contact-kaunas-facebook', 'community-kaunas-resurrection', 'https://www.facebook.com/groups/ortodoksaikaune', 'facebook', 0, 'Facebook'),
		('contact-klaipeda-facebook', 'community-klaipeda-george', 'https://www.facebook.com/groups/1363716107508280', 'facebook', 0, 'Facebook'),
		('contact-siauliai-email', 'community-siauliai-george', 'mailto:egzarchatas@ortodoksas.lt', 'email', 0, 'egzarchatas@ortodoksas.lt'),
		('contact-taurage-facebook', 'community-taurage', 'https://www.facebook.com/groups/tauragesortodoksai/', 'facebook', 0, 'Facebook'),
		('contact-anyksciai-email', 'community-anyksciai', 'mailto:egzarchatas@ortodoksas.lt', 'email', 0, 'egzarchatas@ortodoksas.lt'),
		('contact-elektrenai-email', 'community-elektrenai', 'mailto:egzarchatas@ortodoksas.lt', 'email', 0, 'egzarchatas@ortodoksas.lt')
)
INSERT INTO `community_contacts` (`community_id`, `created_at`, `href`, `id`, `kind`, `sort_order`, `updated_at`)
SELECT `community_id`, unixepoch() * 1000, `href`, `id`, `kind`, `sort_order`, unixepoch() * 1000 FROM `contact_map`;
--> statement-breakpoint
WITH `locales` (`language`) AS (VALUES ('lt'), ('en'), ('ru'), ('uk'), ('be')),
`contact_map` (`id`, `label`) AS (
	VALUES
		('contact-vilnius-trinity-web', 'Trejybe.lt'), ('contact-vilnius-trinity-facebook', 'Facebook'),
		('contact-vilnius-trinity-instagram', 'Instagram'), ('contact-vilnius-nicholas-facebook', 'Facebook'),
		('contact-vilnius-annunciation-facebook', 'Facebook'), ('contact-vilnius-annunciation-telegram', 'Telegram'),
		('contact-kaunas-facebook', 'Facebook'), ('contact-klaipeda-facebook', 'Facebook'),
		('contact-siauliai-email', 'egzarchatas@ortodoksas.lt'), ('contact-taurage-facebook', 'Facebook'),
		('contact-anyksciai-email', 'egzarchatas@ortodoksas.lt'), ('contact-elektrenai-email', 'egzarchatas@ortodoksas.lt')
)
INSERT INTO `community_contact_localizations` (`community_contact_id`, `label`, `language`)
SELECT `contact_map`.`id`, `contact_map`.`label`, `locales`.`language` FROM `contact_map` CROSS JOIN `locales`;
--> statement-breakpoint
WITH `service_map` (`id`, `community_id`, `sort_order`) AS (
	VALUES
		('service-vilnius-trinity-1', 'community-vilnius-trinity', 0),
		('service-vilnius-nicholas-1', 'community-vilnius-nicholas', 0),
		('service-vilnius-annunciation-1', 'community-vilnius-annunciation', 0),
		('service-vilnius-annunciation-2', 'community-vilnius-annunciation', 1),
		('service-kaunas-1', 'community-kaunas-resurrection', 0), ('service-kaunas-2', 'community-kaunas-resurrection', 1),
		('service-klaipeda-1', 'community-klaipeda-george', 0), ('service-siauliai-1', 'community-siauliai-george', 0),
		('service-taurage-1', 'community-taurage', 0), ('service-anyksciai-1', 'community-anyksciai', 0)
)
INSERT INTO `community_services` (`community_id`, `created_at`, `ends_at`, `id`, `sort_order`, `starts_at`, `updated_at`)
SELECT `community_id`, unixepoch() * 1000, NULL, `id`, `sort_order`, NULL, unixepoch() * 1000 FROM `service_map`;
--> statement-breakpoint
INSERT INTO `community_service_localizations` (`community_service_id`, `language`, `schedule_text`)
VALUES
	('service-vilnius-trinity-1','lt','Sekmadienį 9:00 — Dieviškoji Liturgija lietuvių kalba'), ('service-vilnius-trinity-1','en','Sunday 9:00 — Divine Liturgy in Lithuanian'), ('service-vilnius-trinity-1','ru','Воскресенье 9:00 — Божественная литургия на литовском языке'), ('service-vilnius-trinity-1','uk','Неділя 9:00 — Божественна літургія литовською мовою'), ('service-vilnius-trinity-1','be','Нядзеля 9:00 — Боская літургія па-літоўску'),
	('service-vilnius-nicholas-1','lt','Sekmadienį 9:00 — Dieviškoji Liturgija bažnytine slavų kalba'), ('service-vilnius-nicholas-1','en','Sunday 9:00 — Divine Liturgy in Church Slavonic'), ('service-vilnius-nicholas-1','ru','Воскресенье 9:00 — Божественная литургия на церковнославянском языке'), ('service-vilnius-nicholas-1','uk','Неділя 9:00 — Божественна літургія церковнослов’янською мовою'), ('service-vilnius-nicholas-1','be','Нядзеля 9:00 — Боская літургія па-царкоўнаславянску'),
	('service-vilnius-annunciation-1','lt','Sekmadienį 8:45 — Dieviškoji Liturgija ukrainiečių kalba'), ('service-vilnius-annunciation-1','en','Sunday 8:45 — Divine Liturgy in Ukrainian'), ('service-vilnius-annunciation-1','ru','Воскресенье 8:45 — Божественная литургия на украинском языке'), ('service-vilnius-annunciation-1','uk','Неділя 8:45 — Божественна літургія українською мовою'), ('service-vilnius-annunciation-1','be','Нядзеля 8:45 — Боская літургія па-ўкраінску'),
	('service-vilnius-annunciation-2','lt','Sekmadienį 10:30 — Dieviškoji Liturgija baltarusių kalba'), ('service-vilnius-annunciation-2','en','Sunday 10:30 — Divine Liturgy in Belarusian'), ('service-vilnius-annunciation-2','ru','Воскресенье 10:30 — Божественная литургия на белорусском языке'), ('service-vilnius-annunciation-2','uk','Неділя 10:30 — Божественна літургія білоруською мовою'), ('service-vilnius-annunciation-2','be','Нядзеля 10:30 — Боская літургія па-беларуску'),
	('service-kaunas-1','lt','Sekmadienį 10:00 — Dieviškoji Liturgija ukrainiečių kalba'), ('service-kaunas-1','en','Sunday 10:00 — Divine Liturgy in Ukrainian'), ('service-kaunas-1','ru','Воскресенье 10:00 — Божественная литургия на украинском языке'), ('service-kaunas-1','uk','Неділя 10:00 — Божественна літургія українською мовою'), ('service-kaunas-1','be','Нядзеля 10:00 — Боская літургія па-ўкраінску'),
	('service-kaunas-2','lt','Sekmadienį 12:30 — Dieviškoji Liturgija lietuvių kalba'), ('service-kaunas-2','en','Sunday 12:30 — Divine Liturgy in Lithuanian'), ('service-kaunas-2','ru','Воскресенье 12:30 — Божественная литургия на литовском языке'), ('service-kaunas-2','uk','Неділя 12:30 — Божественна літургія литовською мовою'), ('service-kaunas-2','be','Нядзеля 12:30 — Боская літургія па-літоўску'),
	('service-klaipeda-1','lt','Sekmadienį 10:00 — Dieviškoji Liturgija bažnytine slavų kalba'), ('service-klaipeda-1','en','Sunday 10:00 — Divine Liturgy in Church Slavonic'), ('service-klaipeda-1','ru','Воскресенье 10:00 — Божественная литургия на церковнославянском языке'), ('service-klaipeda-1','uk','Неділя 10:00 — Божественна літургія церковнослов’янською мовою'), ('service-klaipeda-1','be','Нядзеля 10:00 — Боская літургія па-царкоўнаславянску'),
	('service-siauliai-1','lt','Pirmą mėnesio šeštadienį 11:30 — Dieviškoji Liturgija ukrainiečių kalba'), ('service-siauliai-1','en','First Saturday of the month at 11:30 — Divine Liturgy in Ukrainian'), ('service-siauliai-1','ru','Первая суббота месяца, 11:30 — Божественная литургия на украинском языке'), ('service-siauliai-1','uk','Перша субота місяця, 11:30 — Божественна літургія українською мовою'), ('service-siauliai-1','be','Першая субота месяца, 11:30 — Боская літургія па-ўкраінску'),
	('service-taurage-1','lt','Pasirinktais šeštadieniais 10:00 — Dieviškoji Liturgija bažnytine slavų kalba; datos skelbiamos Facebook'), ('service-taurage-1','en','Selected Saturdays at 10:00 — Divine Liturgy in Church Slavonic; dates are posted on Facebook'), ('service-taurage-1','ru','В отдельные субботы в 10:00 — Божественная литургия на церковнославянском языке; даты публикуются в Facebook'), ('service-taurage-1','uk','В окремі суботи о 10:00 — Божественна літургія церковнослов’янською мовою; дати публікуються у Facebook'), ('service-taurage-1','be','У асобныя суботы а 10:00 — Боская літургія па-царкоўнаславянску; даты публікуюцца ў Facebook'),
	('service-anyksciai-1','lt','Dieviškoji Liturgija ukrainiečių kalba per didžiąsias šventes; datos skelbiamos atskirai'), ('service-anyksciai-1','en','Divine Liturgy in Ukrainian on major feasts; dates are announced separately'), ('service-anyksciai-1','ru','Божественная литургия на украинском языке в дни великих праздников; даты объявляются отдельно'), ('service-anyksciai-1','uk','Божественна літургія українською мовою на великі свята; дати оголошуються окремо'), ('service-anyksciai-1','be','Боская літургія па-ўкраінску на вялікія святы; даты абвяшчаюцца асобна');
--> statement-breakpoint
WITH `media_map` (`id`, `community_id`, `media_id`, `role`, `sort_order`) AS (
	VALUES
		('community-vilnius-trinity-media-1','community-vilnius-trinity','media_5b51d9d6448032761b372510edee0fcd5a7c21de9bab997839881278dc9954e1','primary',0),
		('community-vilnius-trinity-media-2','community-vilnius-trinity','media_1428bc888a741128a07a6cb86e4e66d0b197a95265c1e25e3075da8a907fa719','gallery',1),
		('community-vilnius-trinity-media-3','community-vilnius-trinity','media_ef6e295547c1a6e0c213ab55e3207b2755d21431df2c732c47dfd637360c79cb','gallery',2),
		('community-vilnius-nicholas-media-1','community-vilnius-nicholas','media_328d99d261466f67ca61199b94a99352c3d5cb5a936e967bd81bb94c4d843c7b','primary',0),
		('community-vilnius-nicholas-media-2','community-vilnius-nicholas','media_a896563e0736dcb135fe7010d03c4e573ca1b8d8b7d17a94ac73fc0194179264','gallery',1),
		('community-vilnius-annunciation-media-1','community-vilnius-annunciation','media_e402488b0505a68b50f8d2cb49cb8e093c9c088938cbe9bfcce00ee7ab2fd3cb','primary',0),
		('community-vilnius-annunciation-media-2','community-vilnius-annunciation','media_16be433a6a6dd960cea04e2dd03e155f8d26511ae31b9ff205fd794da4882bd9','gallery',1),
		('community-vilnius-annunciation-media-3','community-vilnius-annunciation','media_0a7ae95f1a7abdfe7b4ca8700e55fafc700a304897e9b28e51bb836d9d62d59a','gallery',2),
		('community-kaunas-media-1','community-kaunas-resurrection','media_3c44030e16f3a8fdfe2029a2d3827a7b524d2d09ca5fc026629f5457201d8fc0','primary',0),
		('community-kaunas-media-2','community-kaunas-resurrection','media_e03af5aa906b80d2eee7fc83c9ad00b961753a77761d955eaf58b5da677565cc','gallery',1),
		('community-kaunas-media-3','community-kaunas-resurrection','media_de10e3268dee875d6892c7260d5cbb601a46bda0c3fa562d045de9b3a016a760','gallery',2),
		('community-klaipeda-media-1','community-klaipeda-george','media_8d7bd88af56552c64ff9c4a80824fd4c87242c8a399c4e7e491847d735e7bae7','primary',0),
		('community-klaipeda-media-2','community-klaipeda-george','media_d85ddfa1654afa888f27912cf89137c09d5febc59ef70c1cb1b4904aa4d210fd','gallery',1),
		('community-klaipeda-media-3','community-klaipeda-george','media_f6d8576dde5a45316cefdf302b10388cff023561c933b67cdead33571a7688a9','gallery',2),
		('community-siauliai-media-1','community-siauliai-george','media_34c355e0f1430a19e34f10b94fd3379ddff535feb9a03a49b11f789ce24e8ba7','primary',0),
		('community-siauliai-media-2','community-siauliai-george','media_6fa0bdda6eac562e9623625adb2968a64119c6ec60a0bd42eb547edd66b56e28','gallery',1),
		('community-siauliai-media-3','community-siauliai-george','media_9199795fe3a904e74917a8657f24b67f888a2fac21ab7c42e1507a14aa0eb466','gallery',2),
		('community-taurage-media-1','community-taurage','media_d36c3c99e3bafde2cccad3695ffbee1fbfc25c968d3b242888841b00579ea86a','primary',0),
		('community-taurage-media-2','community-taurage','media_5a129c8fbe1e719fbbdf842d4edccf217aaa3167eff026220d9fdd1452408bc9','gallery',1),
		('community-taurage-media-3','community-taurage','media_fc70a048733af90b7a715d7a3b6be7f55cc50c18f43f298122ca57b14dde88d5','gallery',2),
		('community-anyksciai-media-1','community-anyksciai','media_2c597c80d4eeaeddd848b00da6d6d9c573cd7e7ffefbececfbf07324fb757294','primary',0),
		('community-anyksciai-media-2','community-anyksciai','media_8b42dba8015bcd13f4ad363ce437b02bf5509237eb899582194bde67dbb48629','gallery',1),
		('community-anyksciai-media-3','community-anyksciai','media_251ae9b8d512520eb8a40bd279f054af7da1147ee34267c7323ab9011c6e5d26','gallery',2)
)
INSERT INTO `community_media` (`community_id`, `created_at`, `id`, `media_id`, `role`, `sort_order`)
SELECT `media_map`.`community_id`, unixepoch() * 1000, `media_map`.`id`, `media_map`.`media_id`, `media_map`.`role`, `media_map`.`sort_order`
FROM `media_map` JOIN `media_assets` ON `media_assets`.`id` = `media_map`.`media_id`;
--> statement-breakpoint
INSERT INTO `community_media_localizations` (`alt_text`, `caption`, `community_media_id`, `language`)
SELECT `community_localizations`.`name`, '', `community_media`.`id`, `community_localizations`.`language`
FROM `community_media`
JOIN `community_localizations` ON `community_localizations`.`community_id` = `community_media`.`community_id`;
--> statement-breakpoint
WITH `profile_map` (`person_id`, `figure_index`) AS (
	VALUES
		('person-panaretos', 1), ('person-vitalijus-mockus', 4),
		('person-vladimiras-seliavko', 10), ('person-georgy-roy', 15),
		('person-georgy-ananiev', 20), ('person-aliaksandr-kukhta', 25),
		('person-gintaras-sungaila', 29), ('person-jeremiah-yurchenko', 35),
		('person-viktoras-miniotas', 40), ('person-andrey-kuraev', 44),
		('person-ioann-ovchinnikov', 49), ('person-platon-konishchev', 54)
)
INSERT INTO `person_media` (`created_at`, `id`, `media_id`, `person_id`, `role`, `sort_order`)
SELECT
	MIN(`articles`.`created_at`),
	`profile_map`.`person_id` || '-portrait',
	json_extract(`figure`.`value`, '$.attrs.mediaId'),
	`profile_map`.`person_id`,
	'primary',
	0
FROM `articles`
JOIN `profile_map`
JOIN json_each(`articles`.`body_json`, '$.content') AS `figure` ON CAST(`figure`.`key` AS integer) = `profile_map`.`figure_index`
JOIN `media_assets` ON `media_assets`.`id` = json_extract(`figure`.`value`, '$.attrs.mediaId')
WHERE `articles`.`translation_group_id` = 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f'
GROUP BY `profile_map`.`person_id`;
--> statement-breakpoint
INSERT INTO `person_media_localizations` (`alt_text`, `caption`, `language`, `person_media_id`)
SELECT `person_localizations`.`display_name`, '', `person_localizations`.`language`, `person_localizations`.`person_id` || '-portrait'
FROM `person_localizations`
JOIN `person_media` ON `person_media`.`id` = `person_localizations`.`person_id` || '-portrait';
--> statement-breakpoint
WITH `profile_map` (`person_id`, `contact_index`) AS (
	VALUES
		('person-vitalijus-mockus', 8), ('person-vladimiras-seliavko', 13),
		('person-georgy-roy', 18), ('person-georgy-ananiev', 23),
		('person-aliaksandr-kukhta', 28), ('person-gintaras-sungaila', 33),
		('person-jeremiah-yurchenko', 38), ('person-viktoras-miniotas', 42),
		('person-ioann-ovchinnikov', 52), ('person-platon-konishchev', 57)
), `contact_links` AS (
	SELECT
		`articles`.`language`,
		`profile_map`.`person_id`,
		`profile_map`.`contact_index`,
		COALESCE((
			SELECT `link_value`.`value`
			FROM json_tree(json_extract(`articles`.`body_json`, '$.content[' || `profile_map`.`contact_index` || ']')) AS `link_value`
			WHERE `link_value`.`key` = 'href'
			LIMIT 1
		), CASE `profile_map`.`person_id`
			WHEN 'person-jeremiah-yurchenko' THEN 'tel:+37065582154'
			WHEN 'person-ioann-ovchinnikov' THEN 'mailto:ioan.ovchinnikov@ortodoksas.lt'
			WHEN 'person-platon-konishchev' THEN 'mailto:konichshevvladimir@gmail.com'
		END) AS `href`
	FROM `articles`
	JOIN `profile_map`
	WHERE `articles`.`translation_group_id` = 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f'
)
INSERT INTO `person_contacts` (`created_at`, `href`, `id`, `kind`, `person_id`, `sort_order`, `updated_at`)
SELECT MIN(`articles`.`created_at`), `contact_links`.`href`, `contact_links`.`person_id` || '-contact',
	CASE WHEN `contact_links`.`href` LIKE 'mailto:%' THEN 'email' WHEN `contact_links`.`href` LIKE 'tel:%' THEN 'phone' ELSE 'website' END,
	`contact_links`.`person_id`, 0, MAX(`articles`.`updated_at`)
FROM `contact_links`
JOIN `articles` ON `articles`.`language` = `contact_links`.`language` AND `articles`.`translation_group_id` = 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f'
WHERE `contact_links`.`href` IS NOT NULL
GROUP BY `contact_links`.`person_id`;
--> statement-breakpoint
WITH `profile_map` (`person_id`, `contact_index`) AS (
	VALUES
		('person-vitalijus-mockus', 8), ('person-vladimiras-seliavko', 13),
		('person-georgy-roy', 18), ('person-georgy-ananiev', 23),
		('person-aliaksandr-kukhta', 28), ('person-gintaras-sungaila', 33),
		('person-jeremiah-yurchenko', 38), ('person-viktoras-miniotas', 42),
		('person-ioann-ovchinnikov', 52), ('person-platon-konishchev', 57)
)
INSERT INTO `person_contact_localizations` (`label`, `language`, `person_contact_id`)
SELECT
	COALESCE((
		SELECT group_concat(`contact_text`.`value`, '')
		FROM json_tree(json_extract(`articles`.`body_json`, '$.content[' || `profile_map`.`contact_index` || ']')) AS `contact_text`
		WHERE `contact_text`.`key` = 'text'
	), ''),
	`articles`.`language`,
	`profile_map`.`person_id` || '-contact'
FROM `articles`
JOIN `profile_map`
JOIN `person_contacts` ON `person_contacts`.`id` = `profile_map`.`person_id` || '-contact'
WHERE `articles`.`translation_group_id` = 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f';
--> statement-breakpoint
WITH `profile_map` (`person_id`, `role_index`) AS (
	VALUES ('person-vitalijus-mockus', 5), ('person-gintaras-sungaila', 30)
)
INSERT INTO `person_positions` (`community_id`, `created_at`, `ends_at`, `id`, `person_id`, `role_key`, `sort_order`, `starts_at`, `updated_at`)
SELECT NULL, MIN(`articles`.`created_at`), NULL, `profile_map`.`person_id` || '-role', `profile_map`.`person_id`,
	CASE `profile_map`.`person_id` WHEN 'person-vitalijus-mockus' THEN 'chancellor' ELSE 'secretary' END,
	0, NULL, MAX(`articles`.`updated_at`)
FROM `profile_map`
JOIN `articles` ON `articles`.`translation_group_id` = 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f'
GROUP BY `profile_map`.`person_id`;
--> statement-breakpoint
WITH `profile_map` (`person_id`, `role_index`) AS (
	VALUES ('person-vitalijus-mockus', 5), ('person-gintaras-sungaila', 30)
)
INSERT INTO `person_position_localizations` (`description`, `language`, `position_id`, `title`)
SELECT '', `articles`.`language`, `profile_map`.`person_id` || '-role',
	COALESCE((
		SELECT group_concat(`role_text`.`value`, '')
		FROM json_tree(json_extract(`articles`.`body_json`, '$.content[' || `profile_map`.`role_index` || ']')) AS `role_text`
		WHERE `role_text`.`key` = 'text'
	), '')
FROM `articles`
JOIN `profile_map`
WHERE `articles`.`translation_group_id` = 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f';
--> statement-breakpoint
UPDATE `articles`
SET `body_json` = json_object(
	'type', 'doc',
	'content', json_array(json_extract(`body_json`, '$.content[0]'))
)
WHERE `translation_group_id` = 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f';
--> statement-breakpoint
UPDATE `articles`
SET `body_json` = json_object('type', 'doc', 'content', json_array())
WHERE `translation_group_id` = 'b7e18d0e-ddd5-49ed-9590-253666cf2d3f';
--> statement-breakpoint
UPDATE `article_baselines`
SET `body_json` = (
	SELECT `articles`.`body_json` FROM `articles` WHERE `articles`.`id` = `article_baselines`.`article_id`
)
WHERE `article_id` IN (
	SELECT `id` FROM `articles`
	WHERE `translation_group_id` IN (
		'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f',
		'b7e18d0e-ddd5-49ed-9590-253666cf2d3f'
	)
);
