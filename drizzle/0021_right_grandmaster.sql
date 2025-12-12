-- 如果表已存在则跳过创建（兼容已有数据库）
CREATE TABLE IF NOT EXISTS `webhook_log` (
	`id` text PRIMARY KEY NOT NULL,
	`webhook_id` text,
	`url` text NOT NULL,
	`event` text NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`webhook_id`) REFERENCES `webhook`(`id`) ON UPDATE no action ON DELETE cascade
);
