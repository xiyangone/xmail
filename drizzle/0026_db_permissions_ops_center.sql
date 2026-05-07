CREATE TABLE `admin_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`summary` text NOT NULL,
	`metadata` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `admin_audit_log_created_at_idx` ON `admin_audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `admin_audit_log_actor_idx` ON `admin_audit_log` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `admin_audit_log_action_idx` ON `admin_audit_log` (`action`);--> statement-breakpoint
CREATE TABLE `api_key_scope` (
	`api_key_id` text NOT NULL,
	`permission_key` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`api_key_id`, `permission_key`),
	FOREIGN KEY (`api_key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_key`) REFERENCES `permission`(`key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `api_key_scope_permission_key_idx` ON `api_key_scope` (`permission_key`);--> statement-breakpoint
CREATE TABLE `email_receiver_log` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`recipient` text NOT NULL,
	`sender` text,
	`message_id` text,
	`email_id` text,
	`subject` text,
	`has_webhook` integer DEFAULT false NOT NULL,
	`webhook_status` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`email_id`) REFERENCES `email`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `email_receiver_log_created_at_idx` ON `email_receiver_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `email_receiver_log_status_idx` ON `email_receiver_log` (`status`);--> statement-breakpoint
CREATE INDEX `email_receiver_log_recipient_idx` ON `email_receiver_log` (`recipient`);--> statement-breakpoint
CREATE TABLE `permission` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_system` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permission_key_unique` ON `permission` (`key`);--> statement-breakpoint
CREATE TABLE `role_permission` (
	`role_id` text NOT NULL,
	`permission_key` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`role_id`, `permission_key`),
	FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_key`) REFERENCES `permission`(`key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `role_permission_permission_key_idx` ON `role_permission` (`permission_key`);--> statement-breakpoint
CREATE TABLE `route_policy` (
	`id` text PRIMARY KEY NOT NULL,
	`path_pattern` text NOT NULL,
	`methods` text DEFAULT '*' NOT NULL,
	`access` text DEFAULT 'permission' NOT NULL,
	`required_permissions` text,
	`allow_api_key` integer DEFAULT false NOT NULL,
	`allow_internal` integer DEFAULT false NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `route_policy_enabled_priority_idx` ON `route_policy` (`enabled`,`priority`);--> statement-breakpoint
CREATE INDEX `route_policy_path_pattern_idx` ON `route_policy` (`path_pattern`);--> statement-breakpoint
CREATE TABLE `worker_run` (
	`id` text PRIMARY KEY NOT NULL,
	`worker_name` text NOT NULL,
	`run_type` text NOT NULL,
	`trigger` text DEFAULT 'scheduled' NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`duration_ms` integer,
	`counts` text,
	`error_message` text,
	`metadata` text
);
--> statement-breakpoint
CREATE INDEX `worker_run_worker_started_at_idx` ON `worker_run` (`worker_name`,`started_at`);--> statement-breakpoint
CREATE INDEX `worker_run_status_idx` ON `worker_run` (`status`);