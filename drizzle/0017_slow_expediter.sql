CREATE INDEX `card_keys_is_used_idx` ON `card_keys` (`is_used`);--> statement-breakpoint
CREATE INDEX `card_keys_expires_at_idx` ON `card_keys` (`expires_at`);--> statement-breakpoint
CREATE INDEX `email_user_id_created_at_idx` ON `email` (`userId`,`created_at`);--> statement-breakpoint
CREATE INDEX `email_user_id_expires_at_idx` ON `email` (`userId`,`expires_at`);--> statement-breakpoint
CREATE INDEX `temp_accounts_user_id_idx` ON `temp_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `temp_accounts_expires_at_idx` ON `temp_accounts` (`expires_at`);--> statement-breakpoint
CREATE INDEX `temp_accounts_is_active_expires_idx` ON `temp_accounts` (`is_active`,`expires_at`);