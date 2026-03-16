ALTER TABLE `api_keys` ADD `total_calls` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `daily_calls` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `daily_date` text;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `monthly_calls` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `monthly_month` text;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `last_used_at` integer;