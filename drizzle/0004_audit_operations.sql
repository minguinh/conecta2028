-- Custom SQL migration file, put your code below! --
CREATE FUNCTION audit_business_changes() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE record jsonb; actor text := nullif(current_setting('app.actor_id',true),'');
BEGIN
 IF TG_OP='DELETE' THEN record:=to_jsonb(OLD); ELSE record:=to_jsonb(NEW); END IF;
 INSERT INTO audit_logs(actor_id,subject_id,action,metadata)
 VALUES(actor,record->>'assigned_to',TG_TABLE_NAME||'.'||lower(TG_OP),jsonb_build_object('recordId',record->>'id'));
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_contacts AFTER INSERT OR UPDATE OR DELETE ON contacts FOR EACH ROW EXECUTE FUNCTION audit_business_changes();
--> statement-breakpoint
CREATE TRIGGER audit_visits AFTER INSERT OR UPDATE OR DELETE ON visits FOR EACH ROW EXECUTE FUNCTION audit_business_changes();
--> statement-breakpoint
CREATE TRIGGER audit_demands AFTER INSERT OR UPDATE OR DELETE ON demands FOR EACH ROW EXECUTE FUNCTION audit_business_changes();
--> statement-breakpoint
CREATE TRIGGER audit_activities AFTER INSERT OR UPDATE OR DELETE ON activities FOR EACH ROW EXECUTE FUNCTION audit_business_changes();
--> statement-breakpoint
CREATE TRIGGER audit_communities AFTER INSERT OR UPDATE OR DELETE ON communities FOR EACH ROW EXECUTE FUNCTION audit_business_changes();
