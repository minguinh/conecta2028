ALTER TABLE "visits" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "kind" text DEFAULT 'visita' NOT NULL;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "performed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "visit_report" text;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_kind" CHECK ("visits"."kind" in ('compromisso','visita'));--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_interval" CHECK ("visits"."ends_at" is null or ("visits"."ends_at">"visits"."scheduled_at" and "visits"."ends_at"<="visits"."scheduled_at"+interval '7 days'));