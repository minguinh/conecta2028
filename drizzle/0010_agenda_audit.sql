-- Custom SQL migration file, put your code below! --
CREATE INDEX visits_responsible_schedule_idx ON visits(assigned_to,scheduled_at);
--> statement-breakpoint
ALTER TABLE visits ADD CONSTRAINT visits_completion_registration CHECK (
 status <> 'concluida' OR kind <> 'visita' OR
 (performed_at IS NOT NULL AND visit_report IS NOT NULL AND length(trim(visit_report)) BETWEEN 1 AND 2000)
) NOT VALID;
--> statement-breakpoint
CREATE FUNCTION audit_agenda_changes() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE changed jsonb; actor text := nullif(current_setting('app.actor_id',true),'');
BEGIN
 IF TG_OP='UPDATE' THEN
  SELECT coalesce(jsonb_agg(k ORDER BY k),'[]'::jsonb) INTO changed FROM jsonb_object_keys(to_jsonb(NEW)) k
  WHERE k NOT IN ('version','updated_at') AND to_jsonb(OLD)->k IS DISTINCT FROM to_jsonb(NEW)->k;
 ELSE changed:='[]'::jsonb; END IF;
 INSERT INTO audit_logs(actor_id,subject_id,action,metadata) VALUES(actor,NEW.assigned_to,'visits.'||lower(TG_OP),jsonb_build_object('recordId',NEW.id,'fields',changed,'status',NEW.status,'kind',NEW.kind,'version',NEW.version));
 IF TG_OP='UPDATE' AND NEW.status='concluida' AND OLD.status<>'concluida' THEN
  INSERT INTO activities(title,community_id,assigned_to,occurred_at) VALUES(
   CASE WHEN NEW.kind='visita' THEN 'Visita realizada: ' ELSE 'Compromisso concluído: ' END || NEW.title,NEW.community_id,NEW.assigned_to,coalesce(NEW.performed_at,now()));
 END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER audit_visits ON visits;
--> statement-breakpoint
CREATE TRIGGER audit_agenda AFTER INSERT OR UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION audit_agenda_changes();
--> statement-breakpoint
CREATE TRIGGER audit_visits_delete AFTER DELETE ON visits FOR EACH ROW EXECUTE FUNCTION audit_business_changes();
