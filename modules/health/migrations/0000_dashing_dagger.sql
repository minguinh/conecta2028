CREATE SCHEMA "health";
--> statement-breakpoint
CREATE TABLE "health"."access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"request_id" uuid,
	"document_id" uuid,
	"action" text NOT NULL,
	"outcome" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_access_outcome" CHECK ("health"."access_logs"."outcome" in ('allowed','denied'))
);
--> statement-breakpoint
CREATE TABLE "health"."documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"mime" text NOT NULL,
	"size" bigint NOT NULL,
	"scan_status" text DEFAULT 'quarentena' NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "health_document_size" CHECK ("health"."documents"."size" between 1 and 8388608),
	CONSTRAINT "health_document_mime" CHECK ("health"."documents"."mime" in ('application/pdf','image/jpeg','image/png')),
	CONSTRAINT "health_document_scan" CHECK ("health"."documents"."scan_status" in ('quarentena','disponivel','rejeitado'))
);
--> statement-breakpoint
CREATE TABLE "health"."erasure_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "health_erasure_status" CHECK ("health"."erasure_jobs"."status" in ('pendente','em_execucao','falha','concluido'))
);
--> statement-breakpoint
CREATE TABLE "health"."legal_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"purpose" text NOT NULL,
	"reference" text NOT NULL,
	"notice_version" text NOT NULL,
	"consented" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_basis_kind" CHECK ("health"."legal_records"."kind" in ('consentimento','outra_base_aprovada')),
	CONSTRAINT "health_basis_evidence" CHECK (length(trim("health"."legal_records"."purpose"))>0 and length(trim("health"."legal_records"."reference"))>0 and length(trim("health"."legal_records"."notice_version"))>0),
	CONSTRAINT "health_consent_explicit" CHECK ("health"."legal_records"."kind"<>'consentimento' or "health"."legal_records"."consented"=true)
);
--> statement-breakpoint
CREATE TABLE "health"."memberships" (
	"subject_id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_role" CHECK ("health"."memberships"."role" in ('atendente_saude','supervisor_saude','encarregado_privacidade_saude'))
);
--> statement-breakpoint
CREATE TABLE "health"."requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol" text NOT NULL,
	"kind" text NOT NULL,
	"person_name" text NOT NULL,
	"phone" text,
	"assigned_to" text NOT NULL,
	"status" text DEFAULT 'recebida' NOT NULL,
	"restricted" boolean DEFAULT true NOT NULL,
	"policy_version" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"hold_until" timestamp with time zone,
	"hold_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requests_protocol_unique" UNIQUE("protocol"),
	CONSTRAINT "health_request_kind" CHECK ("health"."requests"."kind" in ('exame','consulta','cirurgia')),
	CONSTRAINT "health_request_status" CHECK ("health"."requests"."status" in ('recebida','documentacao_pendente','encaminhada','aguardando_retorno','encerrada','cancelada')),
	CONSTRAINT "health_person_name" CHECK (length(trim("health"."requests"."person_name")) between 1 and 150),
	CONSTRAINT "health_request_version" CHECK ("health"."requests"."version">0),
	CONSTRAINT "health_request_expiry" CHECK ("health"."requests"."expires_at">"health"."requests"."created_at"),
	CONSTRAINT "health_hold_evidence" CHECK (("health"."requests"."hold_until" is null and "health"."requests"."hold_reference" is null) or ("health"."requests"."hold_until" is not null and length(trim("health"."requests"."hold_reference"))>0))
);
--> statement-breakpoint
CREATE TABLE "health"."status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"status" text NOT NULL,
	"administrative_note" text,
	"actor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_event_status" CHECK ("health"."status_events"."status" in ('recebida','documentacao_pendente','encaminhada','aguardando_retorno','encerrada','cancelada')),
	CONSTRAINT "health_admin_note" CHECK ("health"."status_events"."administrative_note" is null or length("health"."status_events"."administrative_note")<=500)
);
--> statement-breakpoint
ALTER TABLE "health"."documents" ADD CONSTRAINT "documents_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "health"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health"."documents" ADD CONSTRAINT "documents_uploaded_by_memberships_subject_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "health"."memberships"("subject_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health"."legal_records" ADD CONSTRAINT "legal_records_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "health"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health"."legal_records" ADD CONSTRAINT "legal_records_recorded_by_memberships_subject_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "health"."memberships"("subject_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health"."requests" ADD CONSTRAINT "requests_assigned_to_memberships_subject_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "health"."memberships"("subject_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health"."status_events" ADD CONSTRAINT "status_events_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "health"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health"."status_events" ADD CONSTRAINT "status_events_actor_id_memberships_subject_id_fk" FOREIGN KEY ("actor_id") REFERENCES "health"."memberships"("subject_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_access_request_idx" ON "health"."access_logs" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "health_access_expiry_idx" ON "health"."access_logs" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "health_documents_request_idx" ON "health"."documents" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "health_erasure_status_idx" ON "health"."erasure_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "health_legal_request_idx" ON "health"."legal_records" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "health_requests_assignee_idx" ON "health"."requests" USING btree ("assigned_to","created_at");--> statement-breakpoint
CREATE INDEX "health_requests_expiry_idx" ON "health"."requests" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "health_status_request_idx" ON "health"."status_events" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE FUNCTION health.guard_audit_immutability() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' AND current_user='health_retention_service' AND OLD.expires_at<=now() THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'HEALTH_AUDIT_IMMUTABLE';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER health_audit_immutable BEFORE UPDATE OR DELETE ON health.access_logs FOR EACH ROW EXECUTE FUNCTION health.guard_audit_immutability();
--> statement-breakpoint
CREATE TRIGGER health_audit_no_truncate BEFORE TRUNCATE ON health.access_logs FOR EACH STATEMENT EXECUTE FUNCTION health.guard_audit_immutability();
--> statement-breakpoint
CREATE FUNCTION health.audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor text := nullif(current_setting('health.actor_id',true),''); days integer := nullif(current_setting('health.audit_retention_days',true),'')::integer; row_data jsonb; request_id uuid; document_id uuid;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM health.memberships WHERE subject_id=actor AND active=true) OR days IS NULL OR days<1 OR days>36500 THEN RAISE EXCEPTION 'HEALTH_AUDIT_CONTEXT_REQUIRED'; END IF;
 IF TG_OP='DELETE' THEN row_data:=to_jsonb(OLD); ELSE row_data:=to_jsonb(NEW); END IF;
 request_id:=CASE WHEN TG_TABLE_NAME='requests' THEN (row_data->>'id')::uuid ELSE (row_data->>'request_id')::uuid END;
 document_id:=CASE WHEN TG_TABLE_NAME='documents' THEN (row_data->>'id')::uuid ELSE NULL END;
 INSERT INTO health.access_logs(actor_id,request_id,document_id,action,outcome,expires_at) VALUES(actor,request_id,document_id,TG_TABLE_NAME||'.'||lower(TG_OP),'allowed',now()+make_interval(days=>days));
 IF TG_TABLE_NAME='requests' AND TG_OP<>'DELETE' THEN
  IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO health.status_events(request_id,status,actor_id) VALUES(NEW.id,NEW.status,actor); END IF;
 END IF;
 IF TG_TABLE_NAME='legal_records' AND TG_OP='UPDATE' THEN
  IF NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN UPDATE health.requests SET restricted=true,updated_at=now(),version=version+1 WHERE id=NEW.request_id; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER health_request_audit AFTER INSERT OR UPDATE OR DELETE ON health.requests FOR EACH ROW EXECUTE FUNCTION health.audit_mutation();
--> statement-breakpoint
CREATE TRIGGER health_basis_audit AFTER INSERT OR UPDATE OR DELETE ON health.legal_records FOR EACH ROW EXECUTE FUNCTION health.audit_mutation();
--> statement-breakpoint
CREATE TRIGGER health_document_audit AFTER INSERT OR UPDATE OR DELETE ON health.documents FOR EACH ROW EXECUTE FUNCTION health.audit_mutation();
--> statement-breakpoint
CREATE TRIGGER health_status_audit AFTER INSERT OR UPDATE OR DELETE ON health.status_events FOR EACH ROW EXECUTE FUNCTION health.audit_mutation();
