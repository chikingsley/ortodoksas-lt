ALTER TABLE `articles` ADD `hero_fit` text DEFAULT 'cover' NOT NULL;
--> statement-breakpoint
ALTER TABLE `articles` ADD `hero_focal_x` integer DEFAULT 50 NOT NULL;
--> statement-breakpoint
ALTER TABLE `articles` ADD `hero_focal_y` integer DEFAULT 50 NOT NULL;
--> statement-breakpoint
UPDATE `articles`
SET `hero_fit` = 'contain'
WHERE `slug` IN (
  '2026/07/arkadijaus-vienuolynas-kretos-pilenai',
  '2026/06/lietuvos-egzarchato-pamaldu',
  '2026/06/skaitiniai-sv-petro-ir-pauliaus-diena'
);
