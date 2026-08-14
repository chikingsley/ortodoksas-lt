UPDATE `articles`
SET `body_json` = replace(
	`body_json`,
	'http://ortodhttp://ortodoksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.htmloksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.html',
	'https://ortodoksas.lt/2013/11/sv-jono-auksaburnio-liturgija-su'
)
WHERE instr(
	`body_json`,
	'http://ortodhttp://ortodoksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.htmloksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.html'
) > 0;--> statement-breakpoint

UPDATE `article_revisions`
SET `body_json` = replace(
	`body_json`,
	'http://ortodhttp://ortodoksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.htmloksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.html',
	'https://ortodoksas.lt/2013/11/sv-jono-auksaburnio-liturgija-su'
)
WHERE instr(
	`body_json`,
	'http://ortodhttp://ortodoksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.htmloksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.html'
) > 0;--> statement-breakpoint

UPDATE `article_baselines`
SET `body_json` = replace(
	`body_json`,
	'http://ortodhttp://ortodoksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.htmloksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.html',
	'https://ortodoksas.lt/2013/11/sv-jono-auksaburnio-liturgija-su'
)
WHERE instr(
	`body_json`,
	'http://ortodhttp://ortodoksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.htmloksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.html'
) > 0;--> statement-breakpoint

CREATE TABLE `_publication_link_text_repair_gate` (
	`residue_count` integer NOT NULL CHECK (`residue_count` = 0)
);--> statement-breakpoint

INSERT INTO `_publication_link_text_repair_gate` (`residue_count`)
SELECT
	(SELECT count(*) FROM `articles` WHERE instr(`body_json`, 'http://ortodhttp://ortodoksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.htmloksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.html') > 0)
	+ (SELECT count(*) FROM `article_revisions` WHERE instr(`body_json`, 'http://ortodhttp://ortodoksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.htmloksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.html') > 0)
	+ (SELECT count(*) FROM `article_baselines` WHERE instr(`body_json`, 'http://ortodhttp://ortodoksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.htmloksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.html') > 0);--> statement-breakpoint

DROP TABLE `_publication_link_text_repair_gate`;
