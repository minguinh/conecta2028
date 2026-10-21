ALTER TABLE "demands" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "demands" ADD COLUMN "priority" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "demands" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "demands" ADD COLUMN "resolution" text;--> statement-breakpoint
ALTER TABLE "demands" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "demands" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "demands" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX "demands_responsible_created_idx" ON "demands" USING btree ("assigned_to","created_at");--> statement-breakpoint
CREATE INDEX "demands_due_idx" ON "demands" USING btree ("due_date");--> statement-breakpoint
ALTER TABLE "demands" ADD CONSTRAINT "demands_priority" CHECK ("demands"."priority" in ('baixa','normal','alta','urgente'));--> statement-breakpoint
ALTER TABLE "demands" ADD CONSTRAINT "demands_title" CHECK (length(trim("demands"."title")) between 1 and 180);--> statement-breakpoint
ALTER TABLE "demands" ADD CONSTRAINT "demands_description" CHECK ("demands"."description" is null or length(trim("demands"."description")) between 1 and 3000);--> statement-breakpoint
ALTER TABLE "demands" ADD CONSTRAINT "demands_category_length" CHECK (length(trim("demands"."category")) between 1 and 80);--> statement-breakpoint
ALTER TABLE "demands" ADD CONSTRAINT "demands_version" CHECK ("demands"."version">0);--> statement-breakpoint
ALTER TABLE "demands" ADD CONSTRAINT "demands_resolution_length" CHECK ("demands"."resolution" is null or length(trim("demands"."resolution")) between 1 and 2000);--> statement-breakpoint
ALTER TABLE "demands" ADD CONSTRAINT "demands_closure" CHECK (("demands"."status" in ('em_andamento','aguardando_retorno') and "demands"."closed_at" is null and "demands"."resolution" is null) or ("demands"."status" in ('concluida','cancelada') and "demands"."closed_at" is not null and "demands"."resolution" is not null));--> statement-breakpoint
CREATE FUNCTION guard_demand_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status IN ('concluida','cancelada') THEN RAISE EXCEPTION 'DEMAND_CLOSED'; END IF;
 IF NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'DEMAND_VERSION_REQUIRED'; END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER guard_demand_update BEFORE UPDATE ON demands FOR EACH ROW EXECUTE FUNCTION guard_demand_update();
--> statement-breakpoint
CREATE FUNCTION audit_demand_changes() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE changed jsonb; actor text := nullif(current_setting('app.actor_id',true),''); activity_title text;
BEGIN
 IF TG_OP='UPDATE' THEN
  SELECT coalesce(jsonb_agg(k ORDER BY k),'[]'::jsonb) INTO changed FROM jsonb_object_keys(to_jsonb(NEW)) k
  WHERE k NOT IN ('version','updated_at') AND to_jsonb(OLD)->k IS DISTINCT FROM to_jsonb(NEW)->k;
 ELSE changed:='[]'::jsonb; END IF;
 INSERT INTO audit_logs(actor_id,subject_id,action,metadata) VALUES(actor,NEW.assigned_to,'demands.'||lower(TG_OP),jsonb_build_object('recordId',NEW.id,'fields',changed,'status',NEW.status,'priority',NEW.priority,'version',NEW.version));
 activity_title:=CASE WHEN TG_OP='INSERT' THEN 'Demanda cadastrada: ' WHEN NEW.status='concluida' THEN 'Demanda concluída: ' WHEN NEW.status='cancelada' THEN 'Demanda cancelada: ' ELSE 'Demanda atualizada: ' END;
 INSERT INTO activities(title,community_id,assigned_to) VALUES(activity_title||NEW.title,NEW.community_id,NEW.assigned_to);
 RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER audit_demands ON demands;
--> statement-breakpoint
CREATE TRIGGER audit_demands AFTER INSERT OR UPDATE ON demands FOR EACH ROW EXECUTE FUNCTION audit_demand_changes();
--> statement-breakpoint
CREATE TRIGGER audit_demands_delete AFTER DELETE ON demands FOR EACH ROW EXECUTE FUNCTION audit_business_changes();
