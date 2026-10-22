CREATE SCHEMA "health_auth";
--> statement-breakpoint
CREATE TABLE "health"."patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"identity_encrypted" text NOT NULL,
	"cpf_hash" text,
	"sus_hash" text,
	"assigned_to" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"restricted" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_patient_name_valid" CHECK (length(trim("health"."patients"."name")) between 2 and 150),
	CONSTRAINT "health_patient_version" CHECK ("health"."patients"."version">0)
);
--> statement-breakpoint
CREATE TABLE "health"."private_blobs" (
	"key" text PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"encrypted" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_auth"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_auth"."invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "health_auth"."rateLimit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"lastRequest" bigint NOT NULL,
	CONSTRAINT "rateLimit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "health_auth"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "health_auth"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "health_auth"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health"."documents" ADD COLUMN "preview_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "health"."requests" ADD COLUMN "patient_id" uuid;--> statement-breakpoint
ALTER TABLE "health"."requests" ADD COLUMN "details_encrypted" text;--> statement-breakpoint
ALTER TABLE "health"."patients" ADD CONSTRAINT "patients_assigned_to_memberships_subject_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "health"."memberships"("subject_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health"."private_blobs" ADD CONSTRAINT "private_blobs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "health"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_auth"."account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "health_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_auth"."invitations" ADD CONSTRAINT "invitations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "health_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_auth"."session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "health_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_patient_name" ON "health"."patients" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "health_patient_cpf" ON "health"."patients" USING btree ("cpf_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "health_patient_sus" ON "health"."patients" USING btree ("sus_hash");--> statement-breakpoint
CREATE INDEX "health_blob_document" ON "health"."private_blobs" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "health_auth_account_identity" ON "health_auth"."account" USING btree ("providerId","accountId");--> statement-breakpoint
CREATE INDEX "health_auth_session_user" ON "health_auth"."session" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "health"."requests" ADD CONSTRAINT "requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "health"."patients"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE TRIGGER health_patient_audit AFTER INSERT OR UPDATE OR DELETE ON health.patients FOR EACH ROW EXECUTE FUNCTION health.audit_mutation();
--> statement-breakpoint
CREATE FUNCTION health.guard_patient_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'HEALTH_VERSION_REQUIRED'; END IF; RETURN NEW; END; $$;
--> statement-breakpoint
CREATE TRIGGER health_patient_version BEFORE UPDATE ON health.patients FOR EACH ROW EXECUTE FUNCTION health.guard_patient_version();
--> statement-breakpoint
CREATE INDEX health_patient_request_idx ON health.requests(patient_id,created_at);
--> statement-breakpoint
ALTER TABLE health.private_blobs ADD CONSTRAINT health_blob_size CHECK(octet_length(encrypted) BETWEEN 1 AND 2097152);
--> statement-breakpoint
ALTER TABLE health.documents ADD CONSTRAINT health_document_pages CHECK(jsonb_typeof(preview_keys)='array' AND jsonb_array_length(preview_keys)<=6);
