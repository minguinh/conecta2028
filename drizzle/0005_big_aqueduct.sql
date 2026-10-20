CREATE TABLE "territorial_boundaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"source" text NOT NULL,
	"source_url" text,
	"verified" boolean DEFAULT false NOT NULL,
	"source_key" text NOT NULL,
	"geom" geometry(Geometry,4326) NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "territorial_boundaries_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "geom" geometry(Geometry,4326);--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "kind" text DEFAULT 'comunidade_rural' NOT NULL;--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "geom" geometry(Geometry,4326);--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;