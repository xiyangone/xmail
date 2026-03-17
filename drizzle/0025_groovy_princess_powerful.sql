ALTER TABLE `user_settings` ADD `bg_amber` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `bg_light_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `bg_dark_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `bg_sakura_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `bg_amber_enabled` integer DEFAULT true NOT NULL;