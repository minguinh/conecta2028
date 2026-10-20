ALTER TABLE "contacts" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "legal_basis" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "legal_evidence" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "allow_whatsapp" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "allow_sms" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "allow_calls" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "communication_evidence" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "authorization_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_phone_unique" UNIQUE("phone");