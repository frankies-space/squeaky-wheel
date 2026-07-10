CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"checkin_time" time DEFAULT '08:00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ventures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"priority_weight" numeric(3, 2) DEFAULT '1.0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"max_days_without_attention" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ventures_status_check" CHECK ("status" in ('active','paused','archived'))
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"deadline" date,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_status_check" CHECK ("status" in ('active','done','abandoned'))
);
--> statement-breakpoint
CREATE TABLE "venture_context_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venture_context_chunks_source_type_check" CHECK ("source_type" in ('goal','note','checkin_summary','manual_input'))
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"goal_id" uuid,
	"parent_task_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"level" text NOT NULL,
	"estimated_minutes" integer,
	"status" text DEFAULT 'backlog' NOT NULL,
	"generated_by" text DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_level_check" CHECK ("level" in ('project','epic','task','micro_task')),
	CONSTRAINT "tasks_status_check" CHECK ("status" in ('backlog','proposed','scheduled','done','skipped','rescheduled')),
	CONSTRAINT "tasks_generated_by_check" CHECK ("generated_by" in ('ai','user'))
);
--> statement-breakpoint
CREATE TABLE "daily_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_date" date NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_plans_status_check" CHECK ("status" in ('proposed','confirmed','completed'))
);
--> statement-breakpoint
CREATE TABLE "daily_plan_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_plan_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"slot" smallint NOT NULL,
	"rationale" text,
	"calendar_event_id" text,
	"outcome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_plan_tasks_slot_check" CHECK ("slot" in (1,2,3)),
	CONSTRAINT "daily_plan_tasks_outcome_check" CHECK ("outcome" in ('done','not_done','partial'))
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"daily_plan_id" uuid,
	"type" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "checkins_type_check" CHECK ("type" in ('morning','evening')),
	CONSTRAINT "checkins_status_check" CHECK ("status" in ('in_progress','completed','abandoned'))
);
--> statement-breakpoint
CREATE TABLE "checkin_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkin_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkin_messages_role_check" CHECK ("role" in ('user','assistant'))
);
--> statement-breakpoint
CREATE TABLE "venture_attention_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"daily_plan_id" uuid NOT NULL,
	"attended_at" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"external_calendar_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_connections_provider_check" CHECK ("provider" in ('google','apple'))
);
--> statement-breakpoint
ALTER TABLE "ventures" ADD CONSTRAINT "ventures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_venture_id_ventures_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."ventures"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "venture_context_chunks" ADD CONSTRAINT "venture_context_chunks_venture_id_ventures_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."ventures"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_venture_id_ventures_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."ventures"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "daily_plan_tasks" ADD CONSTRAINT "daily_plan_tasks_daily_plan_id_daily_plans_id_fk" FOREIGN KEY ("daily_plan_id") REFERENCES "public"."daily_plans"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "daily_plan_tasks" ADD CONSTRAINT "daily_plan_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_daily_plan_id_daily_plans_id_fk" FOREIGN KEY ("daily_plan_id") REFERENCES "public"."daily_plans"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "checkin_messages" ADD CONSTRAINT "checkin_messages_checkin_id_checkins_id_fk" FOREIGN KEY ("checkin_id") REFERENCES "public"."checkins"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "venture_attention_log" ADD CONSTRAINT "venture_attention_log_venture_id_ventures_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."ventures"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "venture_attention_log" ADD CONSTRAINT "venture_attention_log_daily_plan_id_daily_plans_id_fk" FOREIGN KEY ("daily_plan_id") REFERENCES "public"."daily_plans"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_ventures_user" ON "ventures" USING btree ("user_id") WHERE status = 'active';
--> statement-breakpoint
CREATE INDEX "idx_goals_venture" ON "goals" USING btree ("venture_id");
--> statement-breakpoint
CREATE INDEX "idx_context_venture" ON "venture_context_chunks" USING btree ("venture_id");
--> statement-breakpoint
CREATE INDEX "idx_context_embedding" ON "venture_context_chunks" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=100);
--> statement-breakpoint
CREATE INDEX "idx_tasks_venture" ON "tasks" USING btree ("venture_id");
--> statement-breakpoint
CREATE INDEX "idx_tasks_parent" ON "tasks" USING btree ("parent_task_id");
--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX "daily_plans_user_id_plan_date_unique" ON "daily_plans" USING btree ("user_id","plan_date");
--> statement-breakpoint
CREATE INDEX "idx_dpt_plan" ON "daily_plan_tasks" USING btree ("daily_plan_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "daily_plan_tasks_daily_plan_id_slot_unique" ON "daily_plan_tasks" USING btree ("daily_plan_id","slot");
--> statement-breakpoint
CREATE INDEX "idx_checkin_messages_checkin" ON "checkin_messages" USING btree ("checkin_id");
--> statement-breakpoint
CREATE INDEX "idx_attention_venture_date" ON "venture_attention_log" USING btree ("venture_id","attended_at" DESC);
