CREATE TABLE `_translation_review_patch` (
	`translation_group_id` text PRIMARY KEY NOT NULL,
	`source_hash` text NOT NULL
);--> statement-breakpoint

INSERT INTO `_translation_review_patch` (`translation_group_id`, `source_hash`) VALUES
('16dc7f91-e096-4af0-90a9-275e90c4f076', '941b2ad0b7c2ed449e4f2d17b9e6044101ebee34160b29b22f794c26c3b156e6'),
('34d91473-83d5-4292-b417-301f31b57350', '650feb6e867b1812e15ef255a1f41b2a02b901d0c33090de200946b6193f147f'),
('36cf4f32-de7a-428a-84f9-473aa5014d4f', 'c3a161f817f4591be18ee7fea16aa3010bc6e13b50e4071a95a89bc359b27b4e'),
('4620e956-3694-49b0-9c0f-490d61d57c10', 'bca698c743d45c1c8bdf42e34d7ff00a0ceff3bdda4674d1395fff4c9a99f34a'),
('5f37f452-0c3b-4b16-b9c8-ade43682364f', 'ba84d54f1840c3d45432e8e1a6bed518ac7e537d1f17a3200b4b702cb2a78e49'),
('60431f12-8666-47f6-8570-0df88becf27a', 'f54367232fcd7e582872b041d965511bf098f75960bad5b593c7df3e687073f0'),
('62ba2710-54be-4fe3-9aa1-634904525543', 'f9c237f0f337bd1845ef1fd41df84c67701c47b32f2c40a8bc5eb4a870e468f0'),
('70ec25ac-8be8-4dc2-bdc3-37ac219118aa', '569ce3fe033a6e33b805e78ee3d0edae0661493095ba29b795c2174ddb055b94'),
('7f2a4110-552b-433e-bde0-59f2681179ef', '524026ba2e4debcbd1d815a6bd9317b4f9b47f6bbac21ca92f7c8f802cbcdb62'),
('830a91dc-37e8-4747-93d3-c27396a7ae5c', '5c70f79e40381a5c663b472b3779c5adf40c90bf8fd5b2fb2d5c7f41c6e3e53f'),
('ae19bf82-1a15-48d2-9d99-a696ac5416ca', 'dc501902199fe9f4631fda2ad0f4ce6304f85617dec88e50c8f104254a7cbed9'),
('c24152ba-7945-4282-8cb0-c13c94dbfba7', 'cb898f886e4643db51fc2f978c859b763c20ae918fe4008a4589e9e5a14c3003'),
('c552d54f-d97c-46ac-b445-dca0dd0f1c6b', '557dd42439913c6712f8c88e6429c115e6712df14898e3fb8428860d579d7d4f'),
('e502390d-6dc9-42be-b97b-9ea1ca1ddddf', '447077bfe0ca172dccc1539cb537ddc1264113cfef772c446cb006e7ea3756ec'),
('eeee4f6a-9104-478d-ba9a-65da2c764b0c', '7505318e75243b1950a74decd9f780042b5a311a079c814b441c77627c17ebaa'),
('fcadfc53-d072-4305-b048-44efa5c7d032', '14aab8e2a2aaae206bc7f366d12161e1ce3221bc93d088393b11973518fa880c');--> statement-breakpoint

CREATE TABLE `_completed_translation_patch` (
	`article_id` text PRIMARY KEY NOT NULL,
	`language` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`alt` text NOT NULL,
	`scripture` text NOT NULL,
	`sermon_heading` text NOT NULL,
	`sermon_one` text NOT NULL,
	`sermon_two` text NOT NULL,
	`reading_index` text NOT NULL
);--> statement-breakpoint

INSERT INTO `_completed_translation_patch` (
	`article_id`, `language`, `slug`, `title`, `summary`, `alt`, `scripture`,
	`sermon_heading`, `sermon_one`, `sermon_two`, `reading_index`
) VALUES
(
	'c987e50d-f437-4f68-b625-170da4899626',
	'en',
	'2026/06/fourth-sunday-gospel-reading-matthew',
	'Fourth Sunday Gospel Reading from Matthew (Mt 8:5–13)',
	'At that time, when Jesus returned to Capernaum, a centurion came to him, pleading: “Lord, my servant is lying at home paralysed and in terrible distress.”',
	'Jesus speaks with the centurion in Capernaum',
	'“[At that time], when Jesus returned to Capernaum, a centurion came to him, pleading: ‘Lord, my servant is lying at home paralysed and in terrible distress.’ Jesus said to him, ‘I will come and heal him.’ The centurion answered, ‘Lord, I am not worthy to have you come under my roof; but only say the word, and my servant will be healed. For I too am a man under authority, with soldiers under me. I say to one, “Go,” and he goes; to another, “Come here,” and he comes; and to my servant, “Do this,” and he does it.’ When Jesus heard this, he was amazed and said to those who followed him, ‘Truly I tell you, nowhere in Israel have I found such faith! Therefore I tell you: many will come from east and west and sit at table with Abraham, Isaac and Jacob in the kingdom of heaven, while the children of the kingdom will be cast into the outer darkness. There will be weeping and gnashing of teeth.’ Then Jesus said to the centurion, ‘Go; let it be done for you as you have believed.’ And the servant was healed that very hour.” (Mt 8:5–13)',
	'Sermons preached for this reading:',
	'Fr G. Sungaila. Whom Do You Serve? (Rom 6:18–23; Mt 8:5–13)',
	'Fr G. Sungaila. Humility – The Foundation of All Virtues',
	'Sunday and feast-day Gospel readings in Lithuanian'
),
(
	'f9e8308b-1545-4575-a0f9-3e463dff1f99',
	'ru',
	'2026/06/evangelskoe-chtenie-chetvertogo-voskresenya-po-matfeyu',
	'Евангельское чтение четвёртого воскресенья по Матфею (Мф 8:5–13)',
	'«[В то время], когда Иисус вернулся в Капернаум, к Нему подошёл сотник и стал просить: „Господи, слуга мой лежит дома в расслаблении и жестоко страдает“».',
	'Иисус беседует с сотником в Капернауме',
	'«[В то время], когда Иисус вернулся в Капернаум, к Нему подошёл сотник и стал просить: „Господи, слуга мой лежит дома в расслаблении и жестоко страдает“. Иисус сказал ему: „Я приду и исцелю его“. Сотник ответил: „Господи, я недостоин, чтобы Ты вошёл под кров мой, но только скажи слово, и слуга мой выздоровеет. Ведь и я, сам будучи подчинённым, имею подвластных мне воинов. Говорю одному: ‘Иди!’ – и он идёт; другому: ‘Приди сюда!’ – и он приходит; слуге моему: ‘Сделай это!’ – и он делает“. Услышав это, Иисус удивился и сказал шедшим за Ним: „Истинно говорю вам: и в Израиле не нашёл Я такой веры! Поэтому говорю вам: многие придут с востока и запада и возлягут с Авраамом, Исааком и Иаковом в Царстве Небесном, а сыны царства будут извержены во тьму внешнюю. Там будет плач и скрежет зубов“. Сотнику же Иисус сказал: „Иди, и да будет тебе по вере твоей!“ И в тот же час слуга его исцелился». (Мф 8:5–13)',
	'Проповеди, произнесённые по случаю этого чтения:',
	'Свящ. Г. Сунгайла. Кому ты служишь? (Рим 6:18–23; Мф 8:5–13)',
	'Свящ. Г. Сунгайла. Смирение – основание всех добродетелей',
	'Воскресные и праздничные евангельские чтения на литовском языке'
);--> statement-breakpoint

INSERT INTO `article_content_changes` (`id`, `article_id`, `field_path`, `change_kind`, `provenance`, `before_value`, `after_value`, `created_at`)
SELECT
	lower(hex(randomblob(16))),
	`article`.`id`,
	'body.content[0].attrs.alt',
	'added',
	'editorial-review',
	'',
	'Jėzus kalbasi su Kafarnaumo šimtininku',
	unixepoch('now') * 1000
FROM `articles` AS `article`
WHERE `article`.`id` = 'e7830dcb-1e7e-4701-8cb7-4c35daca3957';--> statement-breakpoint

UPDATE `articles`
SET
	`body_json` = json_set(
		`body_json`,
		'$.content[0].attrs.alt', 'Jėzus kalbasi su Kafarnaumo šimtininku',
		'$.content[0].attrs.altProvenance', 'manual'
	),
	`updated_at` = unixepoch('now') * 1000
WHERE `id` = 'e7830dcb-1e7e-4701-8cb7-4c35daca3957';--> statement-breakpoint

INSERT INTO `article_content_changes` (`id`, `article_id`, `field_path`, `change_kind`, `provenance`, `before_value`, `after_value`, `created_at`)
SELECT lower(hex(randomblob(16))), `article`.`id`, 'title', 'changed', 'machine-translation', `article`.`title`, `patch`.`title`, unixepoch('now') * 1000
FROM `articles` AS `article`
JOIN `_completed_translation_patch` AS `patch` ON `patch`.`article_id` = `article`.`id`
UNION ALL
SELECT lower(hex(randomblob(16))), `article`.`id`, 'summary', 'added', 'machine-translation', `article`.`summary`, `patch`.`summary`, unixepoch('now') * 1000
FROM `articles` AS `article`
JOIN `_completed_translation_patch` AS `patch` ON `patch`.`article_id` = `article`.`id`
UNION ALL
SELECT lower(hex(randomblob(16))), `article`.`id`, 'body', 'changed', 'machine-translation', `article`.`body_json`, NULL, unixepoch('now') * 1000
FROM `articles` AS `article`
JOIN `_completed_translation_patch` AS `patch` ON `patch`.`article_id` = `article`.`id`;--> statement-breakpoint

UPDATE `articles` AS `article`
SET
	`body_json` = (
		SELECT json_set(
			`source`.`body_json`,
			'$.content[0].attrs.alt', `patch`.`alt`,
			'$.content[0].attrs.altProvenance', 'generated',
			'$.content[0].attrs.sourceAlt', 'Jėzus kalbasi su Kafarnaumo šimtininku',
			'$.content[1].content[0].text', `patch`.`scripture`,
			'$.content[3].content[0].text', `patch`.`sermon_heading`,
			'$.content[4].content[1].text', `patch`.`sermon_one`,
			'$.content[5].content[1].text', `patch`.`sermon_two`,
			'$.content[6].content[0].text', `patch`.`reading_index`
		)
		FROM `_completed_translation_patch` AS `patch`
		JOIN `articles` AS `source` ON `source`.`id` = 'e7830dcb-1e7e-4701-8cb7-4c35daca3957'
		WHERE `patch`.`article_id` = `article`.`id`
	),
	`language` = (SELECT `patch`.`language` FROM `_completed_translation_patch` AS `patch` WHERE `patch`.`article_id` = `article`.`id`),
	`slug` = (SELECT `patch`.`slug` FROM `_completed_translation_patch` AS `patch` WHERE `patch`.`article_id` = `article`.`id`),
	`title` = (SELECT `patch`.`title` FROM `_completed_translation_patch` AS `patch` WHERE `patch`.`article_id` = `article`.`id`),
	`summary` = (SELECT `patch`.`summary` FROM `_completed_translation_patch` AS `patch` WHERE `patch`.`article_id` = `article`.`id`),
	`status` = 'published',
	`translation_kind` = 'machine',
	`translation_review_status` = 'approved',
	`translation_reviewed_at` = unixepoch('now') * 1000,
	`translation_reviewed_by` = 'system:codex-translation-review',
	`translation_source_hash` = '70c12f98d1e3102eb7c8dae17e0986b44c4fc18b1fa7ca0f85096a4887806589',
	`published_at` = (SELECT `source`.`published_at` FROM `articles` AS `source` WHERE `source`.`id` = 'e7830dcb-1e7e-4701-8cb7-4c35daca3957'),
	`updated_at` = unixepoch('now') * 1000
WHERE `article`.`id` IN (SELECT `patch`.`article_id` FROM `_completed_translation_patch` AS `patch`);--> statement-breakpoint

INSERT INTO `article_content_changes` (`id`, `article_id`, `field_path`, `change_kind`, `provenance`, `before_value`, `after_value`, `created_at`)
SELECT lower(hex(randomblob(16))), `article`.`id`, 'terminology', 'changed', 'editorial-review', 'Сусветны патрыярх; Святая Камунія', 'Усяленскі патрыярх; Святое Прычасце', unixepoch('now') * 1000
FROM `articles` AS `article`
WHERE `article`.`id` IN (
	'5c12de1f-9432-43d1-a063-e910b7ceaa0f',
	'6327daa1-0c97-4374-8f0b-c1d781c3abb7',
	'a2c4efd1-5667-453e-9711-a7db06dfc423',
	'81f33c3e-fc18-4c04-8d18-7b566eb635f8',
	'2860c1ad-1db0-410c-92e3-4600d8cab48d'
);--> statement-breakpoint

UPDATE `articles`
SET
	`title` = replace(replace(replace(`title`, 'Сусветнага', 'Усяленскага'), 'Сусветным', 'Усяленскім'), 'Сусветны', 'Усяленскі'),
	`summary` = replace(replace(replace(`summary`, 'Сусветнага', 'Усяленскага'), 'Сусветным', 'Усяленскім'), 'Сусветны', 'Усяленскі'),
	`body_json` = replace(
		replace(replace(replace(`body_json`, 'Сусветнага', 'Усяленскага'), 'Сусветным', 'Усяленскім'), 'Сусветны', 'Усяленскі'),
		'Святой Камуніі',
		'Святога Прычасця'
	),
	`updated_at` = unixepoch('now') * 1000
WHERE `id` IN (
	'5c12de1f-9432-43d1-a063-e910b7ceaa0f',
	'6327daa1-0c97-4374-8f0b-c1d781c3abb7',
	'a2c4efd1-5667-453e-9711-a7db06dfc423',
	'81f33c3e-fc18-4c04-8d18-7b566eb635f8',
	'2860c1ad-1db0-410c-92e3-4600d8cab48d'
);--> statement-breakpoint

INSERT INTO `article_content_changes` (`id`, `article_id`, `field_path`, `change_kind`, `provenance`, `before_value`, `after_value`, `created_at`)
SELECT
	lower(hex(randomblob(16))),
	`article`.`id`,
	'body.content[5].text',
	'changed',
	'editorial-review',
	CASE `article`.`id`
		WHEN '6327daa1-0c97-4374-8f0b-c1d781c3abb7' THEN 'Служэнне ігумена Ераміі Юрчанкі ў Літве — важны крок ва ўмацаванні ўкраінскай праваслаўнай пастырскай апекі і супольнага жыцця.'
		WHEN '2c15c5f0-7377-474f-b62a-ac6ff5a99dd7' THEN 'Служение игумена Иеремии Юрченко в Литве — важный шаг в укреплении украинского православного пастырского окормления и общинной жизни.'
	END,
	CASE `article`.`id`
		WHEN '6327daa1-0c97-4374-8f0b-c1d781c3abb7' THEN 'Служэнне ігумена Ераміі Юрчанкі ў Літве з’яўляецца важным крокам ва ўмацаванні ўкраінскай праваслаўнай пастырскай апекі і супольнага жыцця.'
		WHEN '2c15c5f0-7377-474f-b62a-ac6ff5a99dd7' THEN 'Служение игумена Иеремии Юрченко в Литве является важным шагом в укреплении украинского православного пастырского окормления и общинной жизни.'
	END,
	unixepoch('now') * 1000
FROM `articles` AS `article`
WHERE `article`.`id` IN ('6327daa1-0c97-4374-8f0b-c1d781c3abb7', '2c15c5f0-7377-474f-b62a-ac6ff5a99dd7');--> statement-breakpoint

UPDATE `articles`
SET
	`body_json` = json_set(
		`body_json`,
		'$.content[5].content[0].text',
		CASE `id`
			WHEN '6327daa1-0c97-4374-8f0b-c1d781c3abb7' THEN 'Служэнне ігумена Ераміі Юрчанкі ў Літве з’яўляецца важным крокам ва ўмацаванні ўкраінскай праваслаўнай пастырскай апекі і супольнага жыцця. Літоўскі экзархат і надалей імкнецца быць адкрытай духоўнай прасторай для ўсіх праваслаўных хрысціян, якія шукаюць царкоўнага жыцця ў еднасці з Усяленскім патрыярхатам.'
			WHEN '2c15c5f0-7377-474f-b62a-ac6ff5a99dd7' THEN 'Служение игумена Иеремии Юрченко в Литве является важным шагом в укреплении украинского православного пастырского окормления и общинной жизни. Литовский экзархат и впредь стремится быть открытым духовным пространством для всех православных христиан, ищущих церковной жизни в общении со Вселенским патриархатом.'
		END
	),
	`updated_at` = unixepoch('now') * 1000
WHERE `id` IN ('6327daa1-0c97-4374-8f0b-c1d781c3abb7', '2c15c5f0-7377-474f-b62a-ac6ff5a99dd7');--> statement-breakpoint

INSERT INTO `article_content_changes` (`id`, `article_id`, `field_path`, `change_kind`, `provenance`, `before_value`, `after_value`, `created_at`)
SELECT lower(hex(randomblob(16))), `article`.`id`, 'ukrainian-dash-typography', 'changed', 'editorial-review', '—', '–', unixepoch('now') * 1000
FROM `articles` AS `article`
WHERE `article`.`id` IN (
	'bd178ce0-4fcf-447a-aac2-8ccdffc18374',
	'9690a950-ef96-40d0-8a2b-9b8509ddd4e7',
	'a0b594ff-4701-4a71-93f5-471d1002e1fb',
	'3ab91690-db1a-420a-b090-a6e5a596202c',
	'0ef96661-329d-4163-80c3-ac7b2618a8c7',
	'9137f3c1-eb1b-47b1-b8d0-5fbed3b91530'
);--> statement-breakpoint

UPDATE `articles`
SET
	`title` = replace(`title`, '—', '–'),
	`summary` = replace(`summary`, '—', '–'),
	`body_json` = replace(`body_json`, '—', '–'),
	`updated_at` = unixepoch('now') * 1000
WHERE `id` IN (
	'bd178ce0-4fcf-447a-aac2-8ccdffc18374',
	'9690a950-ef96-40d0-8a2b-9b8509ddd4e7',
	'a0b594ff-4701-4a71-93f5-471d1002e1fb',
	'3ab91690-db1a-420a-b090-a6e5a596202c',
	'0ef96661-329d-4163-80c3-ac7b2618a8c7',
	'9137f3c1-eb1b-47b1-b8d0-5fbed3b91530'
);--> statement-breakpoint

UPDATE `articles`
SET
	`translation_source_hash` = (
		SELECT `patch`.`source_hash`
		FROM `_translation_review_patch` AS `patch`
		WHERE `patch`.`translation_group_id` = `articles`.`translation_group_id`
	),
	`translation_review_status` = 'approved',
	`translation_reviewed_at` = unixepoch('now') * 1000,
	`translation_reviewed_by` = 'system:codex-translation-review',
	`updated_at` = unixepoch('now') * 1000
WHERE `language` <> 'lt'
	AND `translation_kind` = 'machine'
	AND `status` = 'published'
	AND `translation_review_status` = 'pending'
	AND `translation_group_id` IN (SELECT `translation_group_id` FROM `_translation_review_patch`);--> statement-breakpoint

INSERT INTO `article_content_changes` (`id`, `article_id`, `field_path`, `change_kind`, `provenance`, `before_value`, `after_value`, `created_at`)
SELECT lower(hex(randomblob(16))), `article`.`id`, 'translationReviewStatus', 'changed', 'editorial-review', 'pending', 'approved', unixepoch('now') * 1000
FROM `articles` AS `article`
WHERE (
	`article`.`language` <> 'lt'
	AND `article`.`translation_group_id` IN (SELECT `translation_group_id` FROM `_translation_review_patch`)
) OR `article`.`id` IN (SELECT `article_id` FROM `_completed_translation_patch`);--> statement-breakpoint

INSERT INTO `article_revisions` (`id`, `article_id`, `editor_id`, `version`, `body_json`, `metadata_json`, `created_at`)
SELECT
	lower(hex(randomblob(16))),
	`article`.`id`,
	'system:codex-translation-review',
	(SELECT coalesce(max(`revision`.`version`), 0) + 1 FROM `article_revisions` AS `revision` WHERE `revision`.`article_id` = `article`.`id`),
	`article`.`body_json`,
	json_object(
		'byline', `article`.`byline`, 'bylineType', `article`.`byline_type`, 'bylineUrl', `article`.`byline_url`,
		'heroFit', `article`.`hero_fit`, 'heroFocalX', `article`.`hero_focal_x`, 'heroFocalY', `article`.`hero_focal_y`,
		'heroMediaId', `article`.`hero_media_id`, 'kind', `article`.`kind`, 'labels', json(`article`.`labels_json`),
		'language', `article`.`language`, 'publishedAt', `article`.`published_at`, 'section', `article`.`section`,
		'seoDescription', `article`.`seo_description`, 'seoTitle', `article`.`seo_title`, 'slug', `article`.`slug`,
		'snapshotCompleteness', 'complete', 'snapshotVersion', 5, 'status', `article`.`status`,
		'summary', `article`.`summary`, 'title', `article`.`title`, 'translationGroupId', `article`.`translation_group_id`,
		'translationKind', `article`.`translation_kind`, 'translationReviewedAt', `article`.`translation_reviewed_at`,
		'translationReviewedBy', `article`.`translation_reviewed_by`, 'translationReviewStatus', `article`.`translation_review_status`,
		'translationSourceArticleId', `article`.`translation_source_article_id`, 'translationSourceHash', `article`.`translation_source_hash`
	),
	unixepoch('now') * 1000
FROM `articles` AS `article`
WHERE (
	`article`.`language` <> 'lt'
	AND `article`.`translation_group_id` IN (SELECT `translation_group_id` FROM `_translation_review_patch`)
) OR `article`.`id` IN (
	'e7830dcb-1e7e-4701-8cb7-4c35daca3957',
	'c987e50d-f437-4f68-b625-170da4899626',
	'f9e8308b-1545-4575-a0f9-3e463dff1f99'
);--> statement-breakpoint

CREATE TABLE `_translation_review_quality_gate` (
	`reviewed_machine_count` integer NOT NULL,
	`eligible_machine_count` integer NOT NULL,
	`incomplete_completed_drafts` integer NOT NULL CHECK (`incomplete_completed_drafts` = 0),
	`remaining_be_terms` integer NOT NULL CHECK (`remaining_be_terms` = 0),
	`remaining_uk_em_dashes` integer NOT NULL CHECK (`remaining_uk_em_dashes` = 0),
	`missing_completed_alt` integer NOT NULL CHECK (`missing_completed_alt` = 0),
	CHECK (`reviewed_machine_count` = `eligible_machine_count`)
);--> statement-breakpoint

INSERT INTO `_translation_review_quality_gate` (
	`reviewed_machine_count`,
	`eligible_machine_count`,
	`incomplete_completed_drafts`,
	`remaining_be_terms`,
	`remaining_uk_em_dashes`,
	`missing_completed_alt`
)
SELECT
	(
		SELECT count(*) FROM `articles` AS `article`
		WHERE `article`.`language` <> 'lt'
			AND `article`.`translation_kind` = 'machine'
			AND `article`.`status` = 'published'
			AND `article`.`translation_review_status` = 'approved'
			AND `article`.`translation_group_id` IN (SELECT `translation_group_id` FROM `_translation_review_patch`)
	),
	(
		SELECT count(*) FROM `articles` AS `article`
		WHERE `article`.`language` <> 'lt'
			AND `article`.`translation_kind` = 'machine'
			AND `article`.`status` = 'published'
			AND `article`.`translation_group_id` IN (SELECT `translation_group_id` FROM `_translation_review_patch`)
	),
	(
		SELECT count(*) FROM `articles` AS `article`
		WHERE `article`.`id` IN (SELECT `article_id` FROM `_completed_translation_patch`)
			AND (
				`article`.`status` <> 'published'
				OR `article`.`translation_kind` <> 'machine'
				OR `article`.`translation_review_status` <> 'approved'
				OR trim(`article`.`summary`) = ''
				OR length(`article`.`body_json`) < 500
			)
	),
	(
		SELECT count(*) FROM `articles` AS `article`
		WHERE `article`.`language` = 'be'
			AND `article`.`translation_group_id` IN (SELECT `translation_group_id` FROM `_translation_review_patch`)
			AND (`article`.`title` || `article`.`summary` || `article`.`body_json`) LIKE '%Сусветн%'
	),
	(
		SELECT count(*) FROM `articles` AS `article`
		WHERE `article`.`language` = 'uk'
			AND `article`.`translation_group_id` IN (SELECT `translation_group_id` FROM `_translation_review_patch`)
			AND (`article`.`title` || `article`.`summary` || `article`.`body_json`) LIKE '%—%'
	),
	(
		SELECT count(*)
		FROM `articles` AS `article`, json_tree(`article`.`body_json`) AS `node`
		WHERE `article`.`id` IN (
			'e7830dcb-1e7e-4701-8cb7-4c35daca3957',
			'c987e50d-f437-4f68-b625-170da4899626',
			'f9e8308b-1545-4575-a0f9-3e463dff1f99'
		)
			AND `node`.`type` = 'text'
			AND `node`.`key` = 'alt'
			AND trim(CAST(`node`.`value` AS text)) = ''
	);--> statement-breakpoint

DROP TABLE `_translation_review_quality_gate`;--> statement-breakpoint
DROP TABLE `_completed_translation_patch`;--> statement-breakpoint
DROP TABLE `_translation_review_patch`;
