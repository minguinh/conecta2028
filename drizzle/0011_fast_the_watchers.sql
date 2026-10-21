CREATE TABLE "contact_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"contact_version" integer NOT NULL,
	"legal_basis" text,
	"purpose" text,
	"legal_evidence" text,
	"allow_whatsapp" boolean NOT NULL,
	"allow_sms" boolean NOT NULL,
	"allow_calls" boolean NOT NULL,
	"communication_evidence" text,
	"recorded_by" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "contact_authorizations_version" CHECK ("contact_authorizations"."contact_version">0),
	CONSTRAINT "contact_authorizations_source" CHECK ("contact_authorizations"."source" in ('cadastro','alteracao','migracao')),
	CONSTRAINT "contact_authorizations_basis" CHECK ("contact_authorizations"."legal_basis" is null or "contact_authorizations"."legal_basis" in ('consentimento','obrigacao_legal','politica_publica','contrato','legitimo_interesse')),
	CONSTRAINT "contact_authorizations_evidence" CHECK ((not "contact_authorizations"."allow_whatsapp" and not "contact_authorizations"."allow_sms" and not "contact_authorizations"."allow_calls") or ("contact_authorizations"."communication_evidence" is not null and length(trim("contact_authorizations"."communication_evidence")) between 1 and 1000))
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"code" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "permissions_code_format" CHECK ("permissions"."code" ~ '^[a-z]+[.][a-z]+$')
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_code" text NOT NULL,
	"permission_code" text NOT NULL,
	CONSTRAINT "role_permissions_role_code_permission_code_pk" PRIMARY KEY("role_code","permission_code")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	CONSTRAINT "roles_label_nonempty" CHECK (length(trim("roles"."label")) between 1 and 120)
);
--> statement-breakpoint
INSERT INTO roles(code,label,enabled) VALUES ('administrador_geral','Administrador geral',true),('coordenador','Coordenador',true),('assessor','Assessor',true),('analista','Analista',true),('atendente_saude','Atendente de saúde (futuro)',false);
--> statement-breakpoint
INSERT INTO permissions(code,description) VALUES ('audit.read','audit.read'),('dashboard.read','dashboard.read'),('history.self','history.self'),('operations.read','operations.read'),('operations.write','operations.write'),('reports.read','reports.read'),('territory.manage','territory.manage'),('territory.read','territory.read'),('users.manage','users.manage'),('users.read','users.read');
--> statement-breakpoint
INSERT INTO role_permissions(role_code,permission_code) VALUES ('administrador_geral','territory.read'),('administrador_geral','territory.manage'),('administrador_geral','dashboard.read'),('administrador_geral','operations.read'),('administrador_geral','operations.write'),('administrador_geral','reports.read'),('administrador_geral','users.read'),('administrador_geral','users.manage'),('administrador_geral','audit.read'),('administrador_geral','history.self'),('coordenador','territory.read'),('coordenador','territory.manage'),('coordenador','dashboard.read'),('coordenador','operations.read'),('coordenador','operations.write'),('coordenador','reports.read'),('coordenador','users.read'),('coordenador','history.self'),('assessor','territory.read'),('assessor','dashboard.read'),('assessor','operations.read'),('assessor','operations.write'),('assessor','history.self'),('analista','territory.read'),('analista','dashboard.read'),('analista','reports.read'),('analista','history.self');
--> statement-breakpoint
ALTER TABLE "contact_authorizations" ADD CONSTRAINT "contact_authorizations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_authorizations" ADD CONSTRAINT "contact_authorizations_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_code_roles_code_fk" FOREIGN KEY ("role_code") REFERENCES "public"."roles"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_code_permissions_code_fk" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_authorizations_version_unique" ON "contact_authorizations" USING btree ("contact_id","contact_version");--> statement-breakpoint
CREATE INDEX "contact_authorizations_date_idx" ON "contact_authorizations" USING btree ("contact_id","recorded_at");--> statement-breakpoint
CREATE INDEX "contact_authorizations_actor_idx" ON "contact_authorizations" USING btree ("recorded_by");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_idx" ON "role_permissions" USING btree ("permission_code");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_subject_id_user_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_roles_code_fk" FOREIGN KEY ("role") REFERENCES "public"."roles"("code") ON DELETE restrict ON UPDATE no action;