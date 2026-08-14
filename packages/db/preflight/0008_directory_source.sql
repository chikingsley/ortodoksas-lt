WITH `profile_map` (`person_id`, `figure_index`, `name_index`, `bio_start`, `bio_end`, `contact_index`, `role_index`) AS (
	VALUES
		('person-panaretos', 1, 2, 3, 2, NULL, NULL),
		('person-vitalijus-mockus', 4, 6, 7, 7, 8, 5),
		('person-vladimiras-seliavko', 10, 11, 12, 12, 13, NULL),
		('person-georgy-roy', 15, 16, 17, 17, 18, NULL),
		('person-georgy-ananiev', 20, 21, 22, 22, 23, NULL),
		('person-aliaksandr-kukhta', 25, 26, 27, 27, 28, NULL),
		('person-gintaras-sungaila', 29, 31, 32, 32, 33, 30),
		('person-jeremiah-yurchenko', 35, 36, 37, 37, 38, NULL),
		('person-viktoras-miniotas', 40, 41, 42, 41, 42, NULL),
		('person-andrey-kuraev', 44, 45, 46, 47, NULL, NULL),
		('person-ioann-ovchinnikov', 49, 50, 51, 51, 52, NULL),
		('person-platon-konishchev', 54, 55, 56, 56, 57, NULL)
), `source_profiles` AS (
	SELECT `articles`.`body_json`, `articles`.`language`, `profile_map`.*
	FROM `articles`
	CROSS JOIN `profile_map`
	WHERE `articles`.`translation_group_id` = 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f'
), `extracted_profiles` AS (
	SELECT
		`language`,
		`person_id`,
		json_extract(`body_json`, '$.content[' || `figure_index` || '].type') AS `figure_type`,
		json_extract(`body_json`, '$.content[' || `figure_index` || '].attrs.mediaId') AS `media_id`,
		COALESCE((
			SELECT `name_text`.`value`
			FROM json_tree(json_extract(`body_json`, '$.content[' || `name_index` || ']')) AS `name_text`
			WHERE `name_text`.`key` = 'text'
			ORDER BY `name_text`.`id`
			LIMIT 1
		), '') AS `display_name`,
		CASE WHEN `bio_start` > `bio_end` THEN 0
			ELSE `bio_end` - `bio_start` + 1 END AS `biography_blocks`,
		CASE WHEN `contact_index` IS NULL THEN NULL ELSE COALESCE((
			SELECT `contact_link`.`value`
			FROM json_tree(json_extract(`body_json`, '$.content[' || `contact_index` || ']')) AS `contact_link`
			WHERE `contact_link`.`key` = 'href'
			LIMIT 1
		), CASE `person_id`
			WHEN 'person-jeremiah-yurchenko' THEN 'tel:+37065582154'
			WHEN 'person-ioann-ovchinnikov' THEN 'mailto:ioan.ovchinnikov@ortodoksas.lt'
			WHEN 'person-platon-konishchev' THEN 'mailto:konichshevvladimir@gmail.com'
		END) END AS `contact_href`,
		CASE WHEN `role_index` IS NULL THEN NULL ELSE COALESCE((
			SELECT group_concat(`role_text`.`value`, '')
			FROM json_tree(json_extract(`body_json`, '$.content[' || `role_index` || ']')) AS `role_text`
			WHERE `role_text`.`key` = 'text'
		), '') END AS `role_title`,
		EXISTS (
			SELECT 1 FROM `media_assets`
			WHERE `media_assets`.`id` = json_extract(`body_json`, '$.content[' || `figure_index` || '].attrs.mediaId')
		) AS `media_exists`
	FROM `source_profiles`
)
SELECT
	`language`, `person_id`, `figure_type`, `media_id`, `display_name`,
	`biography_blocks`, `contact_href`, `role_title`, `media_exists`,
	CASE WHEN
		`figure_type` = 'figure'
		AND NULLIF(`media_id`, '') IS NOT NULL
		AND NULLIF(TRIM(`display_name`), '') IS NOT NULL
		AND `media_exists` = 1
		AND (`contact_href` IS NULL OR NULLIF(`contact_href`, '') IS NOT NULL)
		AND (`role_title` IS NULL OR NULLIF(TRIM(`role_title`), '') IS NOT NULL)
	THEN 'valid' ELSE 'invalid' END AS `validation_status`
FROM `extracted_profiles`
ORDER BY `language`, `person_id`;
