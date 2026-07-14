CREATE TABLE `daily_actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`rationale` text NOT NULL,
	`expected_impact` text,
	`effort_minutes` integer DEFAULT 30 NOT NULL,
	`priority` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`due_date` text,
	`linked_experiment_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `experiments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`hypothesis_code` text,
	`channel` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`owner` text DEFAULT 'Founder' NOT NULL,
	`metric` text NOT NULL,
	`target` text NOT NULL,
	`result` text,
	`learning` text,
	`starts_on` text,
	`ends_on` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `founders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`product` text NOT NULL,
	`url` text,
	`stage` text DEFAULT 'pre-revenue' NOT NULL,
	`segment` text DEFAULT 'AI indie hacker' NOT NULL,
	`primary_channel` text,
	`monthly_revenue` integer DEFAULT 0 NOT NULL,
	`top_pain` text,
	`source` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hypotheses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`statement` text NOT NULL,
	`rationale` text,
	`status` text DEFAULT 'untested' NOT NULL,
	`confidence` integer DEFAULT 30 NOT NULL,
	`evidence_for` integer DEFAULT 0 NOT NULL,
	`evidence_against` integer DEFAULT 0 NOT NULL,
	`next_test` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hypotheses_code_unique` ON `hypotheses` (`code`);--> statement-breakpoint
CREATE TABLE `landscape_entities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`url` text,
	`positioning` text,
	`pricing` text,
	`strengths` text,
	`gaps` text,
	`customer` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pains` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`frequency` integer DEFAULT 3 NOT NULL,
	`severity` integer DEFAULT 3 NOT NULL,
	`willingness_to_pay` integer DEFAULT 3 NOT NULL,
	`evidence_count` integer DEFAULT 1 NOT NULL,
	`current_solution` text,
	`opportunity_score` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'observed' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_type` text NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`author` text,
	`published_at` text,
	`excerpt` text,
	`tags` text,
	`related_founder_id` integer,
	`related_pain_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
