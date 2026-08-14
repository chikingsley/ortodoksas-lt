-- Separate presentation fields from imported display names and normalize directory metadata.
ALTER TABLE `person_localizations` ADD `alternate_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `person_localizations` ADD `honorific` text DEFAULT '' NOT NULL;--> statement-breakpoint

WITH `normalized` (`person_id`, `language`, `honorific`, `display_name`, `alternate_name`) AS (
	VALUES
		('person-aliaksandr-kukhta', 'be', 'Свяшч.', 'Аляксандр Кухта', ''),
		('person-aliaksandr-kukhta', 'en', 'Fr.', 'Aliaksandr Kukhta', ''),
		('person-aliaksandr-kukhta', 'lt', 'Kun.', 'Aliaksandras Kuchta', ''),
		('person-aliaksandr-kukhta', 'ru', 'Священник', 'Александр Кухта', ''),
		('person-aliaksandr-kukhta', 'uk', 'Свящ.', 'Аляксандр Кухта', ''),
		('person-andrey-kuraev', 'be', 'Пратадыяк. д-р', 'Андрэй Кураеў', ''),
		('person-andrey-kuraev', 'en', 'Protodeacon Dr.', 'Andrei Kuraev', ''),
		('person-andrey-kuraev', 'lt', 'Protodiak. dr.', 'Andrejus Kurajevas', ''),
		('person-andrey-kuraev', 'ru', 'Протодиакон, д-р', 'Андрей Кураев', ''),
		('person-andrey-kuraev', 'uk', 'Протодиякон д-р', 'Андрій Кураєв', ''),
		('person-georgy-ananiev', 'be', 'Свяшч.', 'Георгіюс Ананіевас', ''),
		('person-georgy-ananiev', 'en', 'Fr.', 'Georgy Ananiev', ''),
		('person-georgy-ananiev', 'lt', 'Kun.', 'Georgijus Ananijevas', ''),
		('person-georgy-ananiev', 'ru', 'Священник', 'Георгий Ананьев', ''),
		('person-georgy-ananiev', 'uk', 'Свящ.', 'Георгіюс Ананієвас', ''),
		('person-georgy-roy', 'be', 'Протапрэсв. д-р', 'Георгіюс Роюс', ''),
		('person-georgy-roy', 'en', 'Archpriest Dr.', 'Georgy Roy', ''),
		('person-georgy-roy', 'lt', 'Arkikun. dr.', 'Georgijus Rojus', ''),
		('person-georgy-roy', 'ru', 'Протоиерей, д-р', 'Георгий Рой', ''),
		('person-georgy-roy', 'uk', 'Протоієр. д-р', 'Георгіюс Роюс', ''),
		('person-gintaras-sungaila', 'be', 'Свяшч. д-р', 'Гінтарас Юргіс Сунгайла', ''),
		('person-gintaras-sungaila', 'en', 'Fr. Dr.', 'Gintaras Jurgis Sungaila', ''),
		('person-gintaras-sungaila', 'lt', 'Kun. dr.', 'Gintaras Jurgis Sungaila', ''),
		('person-gintaras-sungaila', 'ru', 'Священник, д-р', 'Гинтарас Юргис Сунгайла', ''),
		('person-gintaras-sungaila', 'uk', 'Свящ. д-р', 'Гінтарас Юргіс Сунгайла', ''),
		('person-ioann-ovchinnikov', 'be', 'Дыяк.', 'Ёанас Аўчыннікаў', ''),
		('person-ioann-ovchinnikov', 'en', 'Deacon', 'Ioan Ovchinnikov', ''),
		('person-ioann-ovchinnikov', 'lt', 'Diak.', 'Joanas Ovčinnikovas', ''),
		('person-ioann-ovchinnikov', 'ru', 'Диакон', 'Иоанн Овчинников', ''),
		('person-ioann-ovchinnikov', 'uk', 'Диякон', 'Іоан Овчинников', ''),
		('person-jeremiah-yurchenko', 'be', 'Іераманах', 'Ерамія', 'Вячаслаў Юрчанка'),
		('person-jeremiah-yurchenko', 'en', 'Hieromonk', 'Jeremiah', 'Viacheslav Yurchenko'),
		('person-jeremiah-yurchenko', 'lt', 'Kun. vien.', 'Jeremijas', 'Viačeslav Jurčenko'),
		('person-jeremiah-yurchenko', 'ru', 'Иеромонах', 'Иеремия', 'Вячеслав Юрченко'),
		('person-jeremiah-yurchenko', 'uk', 'Ієромонах', 'Єремія', 'В’ячеслав Юрченко'),
		('person-panaretos', 'be', 'Яго Высокапраасвяшчэнства', 'Панарэт', ''),
		('person-panaretos', 'en', 'His Excellency', 'Panaretos', ''),
		('person-panaretos', 'lt', 'Jo Ekselencija', 'Panaretas', ''),
		('person-panaretos', 'ru', 'Его Преосвященство', 'Панарет', ''),
		('person-panaretos', 'uk', 'Його Преосвященство', 'Панарет', ''),
		('person-platon-konishchev', 'be', 'Дыяк.', 'Платонас', 'Уладзімірас Каніхшавас'),
		('person-platon-konishchev', 'en', 'Deacon', 'Platon', 'Vladimir Konishchev'),
		('person-platon-konishchev', 'lt', 'Diak.', 'Platonas', 'Vladimiras Konichshevas'),
		('person-platon-konishchev', 'ru', 'Диакон', 'Платон', 'Владимир Конищев'),
		('person-platon-konishchev', 'uk', 'Диякон', 'Платон', 'Володимир Коніщев'),
		('person-viktoras-miniotas', 'be', 'Архідыяк.', 'Віктарас Мініотас', ''),
		('person-viktoras-miniotas', 'en', 'Archdeacon', 'Viktoras Miniotas', ''),
		('person-viktoras-miniotas', 'lt', 'Arkidiak.', 'Viktoras Miniotas', ''),
		('person-viktoras-miniotas', 'ru', 'Архидиакон', 'Викторас Миниотас', ''),
		('person-viktoras-miniotas', 'uk', 'Архідиякон', 'Вікторас Мініотас', ''),
		('person-vitalijus-mockus', 'be', 'Протапрэсв.', 'Віталіюс Моцкус', ''),
		('person-vitalijus-mockus', 'en', 'Archpriest', 'Vitalijus Mockus', ''),
		('person-vitalijus-mockus', 'lt', 'Arkikun.', 'Vitalijus Mockus', ''),
		('person-vitalijus-mockus', 'ru', 'Протоиерей', 'Виталий Моцкус', ''),
		('person-vitalijus-mockus', 'uk', 'Протоієр.', 'Віталіюс Моцкус', ''),
		('person-vladimiras-seliavko', 'be', 'Протапрэсв.', 'Уладзімірас Сяляўка', ''),
		('person-vladimiras-seliavko', 'en', 'Archpriest', 'Vladimiras Seliavko', ''),
		('person-vladimiras-seliavko', 'lt', 'Arkikun.', 'Vladimiras Seliavko', ''),
		('person-vladimiras-seliavko', 'ru', 'Протоиерей', 'Владимир Селявко', ''),
		('person-vladimiras-seliavko', 'uk', 'Протоієр.', 'Владімірас Селявко', '')
)
UPDATE `person_localizations` AS `localization`
SET
	`honorific` = `normalized`.`honorific`,
	`display_name` = `normalized`.`display_name`,
	`alternate_name` = `normalized`.`alternate_name`
FROM `normalized`
WHERE
	`localization`.`person_id` = `normalized`.`person_id`
	AND `localization`.`language` = `normalized`.`language`;--> statement-breakpoint

UPDATE `person_localizations`
SET `biography_json` = json_set(
	`biography_json`,
	'$.content[0].content[0].text',
	ltrim(
		trim(replace(json_extract(`biography_json`, '$.content[0].content[0].text'), char(160), ' ')),
		' -–—'
	)
)
WHERE json_type(`biography_json`, '$.content[0].content[0].text') = 'text';--> statement-breakpoint

UPDATE `person_localizations`
SET `seo_description` = substr(
	trim(`honorific` || ' ' || `display_name`) || '. ' ||
	COALESCE(json_extract(`biography_json`, '$.content[0].content[0].text'), ''),
	1,
	600
);--> statement-breakpoint

UPDATE `person_contacts`
SET `href` = trim(replace(`href`, char(160), ' '));--> statement-breakpoint

UPDATE `person_contact_localizations`
SET `label` = trim(replace(`label`, char(160), ' '));--> statement-breakpoint

UPDATE `person_media_localizations`
SET `alt_text` = (
	SELECT trim(`localization`.`honorific` || ' ' || `localization`.`display_name`)
	FROM `person_media`
	INNER JOIN `person_localizations` AS `localization`
		ON `localization`.`person_id` = `person_media`.`person_id`
		AND `localization`.`language` = `person_media_localizations`.`language`
	WHERE `person_media`.`id` = `person_media_localizations`.`person_media_id`
)
WHERE EXISTS (
	SELECT 1
	FROM `person_media`
	INNER JOIN `person_localizations` AS `localization`
		ON `localization`.`person_id` = `person_media`.`person_id`
		AND `localization`.`language` = `person_media_localizations`.`language`
	WHERE `person_media`.`id` = `person_media_localizations`.`person_media_id`
);
