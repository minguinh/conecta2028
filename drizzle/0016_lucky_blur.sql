CREATE TABLE "election_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"source_url" text NOT NULL,
	"checksum" text NOT NULL,
	"row_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "election_imports_checksum_unique" UNIQUE("checksum"),
	CONSTRAINT "election_import_kind" CHECK ("election_imports"."kind" in ('results','places')),
	CONSTRAINT "election_import_count" CHECK ("election_imports"."row_count" between 1 and 2000),
	CONSTRAINT "election_import_hash" CHECK ("election_imports"."checksum" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "election_places" (
	"year" integer NOT NULL,
	"uf" text NOT NULL,
	"municipality" text NOT NULL,
	"zone" integer NOT NULL,
	"place" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"import_id" uuid NOT NULL,
	CONSTRAINT "election_places_year_uf_municipality_zone_place_pk" PRIMARY KEY("year","uf","municipality","zone","place"),
	CONSTRAINT "election_place_coordinates" CHECK ("election_places"."latitude" between -90 and 90 and "election_places"."longitude" between -180 and 180),
	CONSTRAINT "election_place_identifiers" CHECK ("election_places"."year" between 1994 and 2100 and "election_places"."zone" between 1 and 9999 and "election_places"."uf" ~ '^[A-Z]{2}$' and "election_places"."municipality" ~ '^[1-9][0-9]{0,6}$' and "election_places"."place" ~ '^[1-9][0-9]{0,7}$')
);
--> statement-breakpoint
CREATE TABLE "election_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"election" text NOT NULL,
	"turn" integer NOT NULL,
	"uf" text NOT NULL,
	"municipality" text NOT NULL,
	"municipality_name" text NOT NULL,
	"zone" integer NOT NULL,
	"section" integer NOT NULL,
	"office" text NOT NULL,
	"office_name" text NOT NULL,
	"option" text NOT NULL,
	"option_name" text NOT NULL,
	"votes" integer NOT NULL,
	"place" text NOT NULL,
	"place_name" text NOT NULL,
	CONSTRAINT "election_result_numbers" CHECK ("election_results"."year" between 1994 and 2100 and "election_results"."turn" in (1,2) and "election_results"."zone" between 1 and 9999 and "election_results"."section" between 1 and 99999 and "election_results"."votes" between 0 and 1000000),
	CONSTRAINT "election_result_codes" CHECK ("election_results"."uf" ~ '^[A-Z]{2}$' and "election_results"."election" ~ '^[0-9]{1,6}$' and "election_results"."municipality" ~ '^[0-9]{1,7}$' and "election_results"."office" ~ '^[0-9]{1,3}$' and "election_results"."option" ~ '^[0-9]{1,9}$' and "election_results"."place" ~ '^[0-9]{1,8}$')
);
--> statement-breakpoint
ALTER TABLE "election_places" ADD CONSTRAINT "election_places_import_id_election_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."election_imports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "election_results" ADD CONSTRAINT "election_results_import_id_election_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."election_imports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "election_result_identity" ON "election_results" USING btree ("year","election","turn","uf","municipality","zone","section","office","option");--> statement-breakpoint
CREATE INDEX "election_result_filter" ON "election_results" USING btree ("year","election","turn","office","uf","municipality");--> statement-breakpoint
CREATE INDEX "election_result_place" ON "election_results" USING btree ("year","uf","municipality","zone","place");