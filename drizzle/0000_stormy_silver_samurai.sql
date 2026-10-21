CREATE TABLE `kitchen_settings` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`input_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`input_json` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`step_index` integer DEFAULT 0 NOT NULL,
	`feedback` text,
	`created_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `meals_owner_created_idx` ON `meals` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shopping_items` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`unit` text NOT NULL,
	`checked` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shopping_owner_name_unit_idx` ON `shopping_items` (`owner_id`,`name`,`unit`);