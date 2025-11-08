CREATE INDEX `message_email_id_received_at_idx` ON `message` (`emailId`,`received_at`);--> statement-breakpoint
CREATE INDEX `message_email_id_sent_at_idx` ON `message` (`emailId`,`sent_at`);