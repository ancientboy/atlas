CREATE TABLE `agent_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` integer NOT NULL,
	`task_id` integer,
	`task` text NOT NULL,
	`status` text NOT NULL,
	`input` text NOT NULL,
	`output` text NOT NULL,
	`tools` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`result` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`task_type` text NOT NULL,
	`priority` integer NOT NULL,
	`risk_level` integer NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`requires_approval` integer DEFAULT 0 NOT NULL,
	`expected_outcome` text NOT NULL,
	`estimated_minutes` integer NOT NULL,
	`evidence` text NOT NULL,
	`created_at` text NOT NULL,
	`started_at` text,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`autonomy_level` integer DEFAULT 1 NOT NULL,
	`schedule` text NOT NULL,
	`success_rate` integer DEFAULT 0 NOT NULL,
	`current_task` text NOT NULL,
	`tools` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `approvals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`action_type` text NOT NULL,
	`title` text NOT NULL,
	`reason` text NOT NULL,
	`payload` text NOT NULL,
	`risk_level` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`expires_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`memory_type` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`source` text NOT NULL,
	`confidence` integer NOT NULL,
	`status` text DEFAULT 'unverified' NOT NULL,
	`last_verified_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `observations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_type` text NOT NULL,
	`source_name` text NOT NULL,
	`content` text NOT NULL,
	`raw_data` text,
	`observed_at` text NOT NULL,
	`processed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`source` text NOT NULL,
	`observed_at` text NOT NULL,
	`confidence` integer NOT NULL,
	`summary` text NOT NULL,
	`suggested_action` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`signal` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`last_sync` text NOT NULL,
	`category` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`metric_date` text NOT NULL,
	`visits` integer DEFAULT 0 NOT NULL,
	`signups` integer DEFAULT 0 NOT NULL,
	`paid` integer DEFAULT 0 NOT NULL,
	`conversion` real DEFAULT 0 NOT NULL,
	`completed_tasks` integer DEFAULT 0 NOT NULL
);
