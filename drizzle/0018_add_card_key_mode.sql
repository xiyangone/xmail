PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_card_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`email_address` text NOT NULL,
	`mode` text DEFAULT 'single' NOT NULL,
	`email_domain` text,
	`email_limit` integer DEFAULT 1,
	`is_used` integer DEFAULT false NOT NULL,
	`used_by` text,
	`used_at` integer,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`used_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_card_keys`("id", "code", "email_address", "is_used", "used_by", "used_at", "created_at", "expires_at", "mode", "email_domain", "email_limit") SELECT "id", "code", "email_address", "is_used", "used_by", "used_at", "created_at", "expires_at", 'single', NULL, 1 FROM `card_keys`;--> statement-breakpoint
DROP TABLE `card_keys`;--> statement-breakpoint
ALTER TABLE `__new_card_keys` RENAME TO `card_keys`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `card_keys_code_unique` ON `card_keys` (`code`);
