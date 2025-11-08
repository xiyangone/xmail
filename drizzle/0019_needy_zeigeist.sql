CREATE TABLE `email_share` (
	`id` text PRIMARY KEY NOT NULL,
	`email_id` text NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`email_id`) REFERENCES `email`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_share_token_unique` ON `email_share` (`token`);--> statement-breakpoint
CREATE INDEX `email_share_email_id_idx` ON `email_share` (`email_id`);--> statement-breakpoint
CREATE INDEX `email_share_token_idx` ON `email_share` (`token`);--> statement-breakpoint
CREATE TABLE `message_share` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`message_id`) REFERENCES `message`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_share_token_unique` ON `message_share` (`token`);--> statement-breakpoint
CREATE INDEX `message_share_message_id_idx` ON `message_share` (`message_id`);--> statement-breakpoint
CREATE INDEX `message_share_token_idx` ON `message_share` (`token`);