UPDATE `articles`
SET `body_json` = replace(
	`body_json`,
	'http://www.religion.in.ua/news/ukrainian_news/24945-sinod-upc-kp-viznachiv-pripiniti-pominannya-vladi-za-bogosluzhinnyam.html,',
	'https://www.religion.in.ua/news/ukrainian_news/24945-sinod-upc-kp-viznachiv-pripiniti-pominannya-vladi-za-bogosluzhinnyam.html'
)
WHERE instr(
	`body_json`,
	'http://www.religion.in.ua/news/ukrainian_news/24945-sinod-upc-kp-viznachiv-pripiniti-pominannya-vladi-za-bogosluzhinnyam.html,'
) > 0;--> statement-breakpoint

UPDATE `article_revisions`
SET `body_json` = replace(
	`body_json`,
	'http://www.religion.in.ua/news/ukrainian_news/24945-sinod-upc-kp-viznachiv-pripiniti-pominannya-vladi-za-bogosluzhinnyam.html,',
	'https://www.religion.in.ua/news/ukrainian_news/24945-sinod-upc-kp-viznachiv-pripiniti-pominannya-vladi-za-bogosluzhinnyam.html'
)
WHERE instr(
	`body_json`,
	'http://www.religion.in.ua/news/ukrainian_news/24945-sinod-upc-kp-viznachiv-pripiniti-pominannya-vladi-za-bogosluzhinnyam.html,'
) > 0;--> statement-breakpoint

UPDATE `article_baselines`
SET `body_json` = replace(
	`body_json`,
	'http://www.religion.in.ua/news/ukrainian_news/24945-sinod-upc-kp-viznachiv-pripiniti-pominannya-vladi-za-bogosluzhinnyam.html,',
	'https://www.religion.in.ua/news/ukrainian_news/24945-sinod-upc-kp-viznachiv-pripiniti-pominannya-vladi-za-bogosluzhinnyam.html'
)
WHERE instr(
	`body_json`,
	'http://www.religion.in.ua/news/ukrainian_news/24945-sinod-upc-kp-viznachiv-pripiniti-pominannya-vladi-za-bogosluzhinnyam.html,'
) > 0;--> statement-breakpoint

CREATE TABLE `_external_reference_repair_gate` (
	`mismatch_count` integer NOT NULL CHECK (`mismatch_count` = 0)
);--> statement-breakpoint

INSERT INTO `_external_reference_repair_gate` (`mismatch_count`)
SELECT COUNT(*)
FROM (
	SELECT `body_json` FROM `articles`
	UNION ALL
	SELECT `body_json` FROM `article_revisions`
	UNION ALL
	SELECT `body_json` FROM `article_baselines`
) AS `document`
WHERE instr(
	`document`.`body_json`,
	'http://www.religion.in.ua/news/ukrainian_news/24945-sinod-upc-kp-viznachiv-pripiniti-pominannya-vladi-za-bogosluzhinnyam.html,'
) > 0;--> statement-breakpoint

DROP TABLE `_external_reference_repair_gate`;
