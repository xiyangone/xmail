PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`created_at` integer,
	`expires_at` integer,
	`enabled` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_api_keys`("id", "user_id", "name", "key", "created_at", "expires_at", "enabled") SELECT "id", "user_id", "name", "key", "created_at", "expires_at", "enabled" FROM `api_keys`;--> statement-breakpoint
DROP TABLE `api_keys`;--> statement-breakpoint
ALTER TABLE `__new_api_keys` RENAME TO `api_keys`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_unique` ON `api_keys` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `name_user_id_unique` ON `api_keys` (`name`,`user_id`);--> statement-breakpoint
CREATE TABLE `__new_card_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`email_address` text NOT NULL,
	`is_used` integer DEFAULT false NOT NULL,
	`used_by` text,
	`used_at` integer,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`used_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_card_keys`("id", "code", "email_address", "is_used", "used_by", "used_at", "created_at", "expires_at") SELECT "id", "code", "email_address", "is_used", "used_by", "used_at", "created_at", "expires_at" FROM `card_keys`;--> statement-breakpoint
DROP TABLE `card_keys`;--> statement-breakpoint
ALTER TABLE `__new_card_keys` RENAME TO `card_keys`;--> statement-breakpoint
CREATE UNIQUE INDEX `card_keys_code_unique` ON `card_keys` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `card_keys_email_address_unique` ON `card_keys` (`email_address`);