-- Custom SQL migration file, put your code below! --
ALTER TABLE contacts ADD CONSTRAINT contacts_legal_registration CHECK (
 phone IS NOT NULL AND phone ~ '^55[1-9][0-9](9[0-9]{8}|[2-5][0-9]{7})$'
 AND community_id IS NOT NULL
 AND legal_basis IS NOT NULL AND legal_basis IN ('consentimento','obrigacao_legal','politica_publica','contrato','legitimo_interesse')
 AND purpose IS NOT NULL AND length(trim(purpose)) BETWEEN 1 AND 500
 AND legal_evidence IS NOT NULL AND length(trim(legal_evidence)) BETWEEN 1 AND 1000
) NOT VALID;
--> statement-breakpoint
ALTER TABLE contacts ADD CONSTRAINT contacts_communication_evidence CHECK (
 (NOT allow_whatsapp AND NOT allow_sms AND NOT allow_calls) OR
 (communication_evidence IS NOT NULL AND length(trim(communication_evidence)) BETWEEN 1 AND 1000 AND authorization_at IS NOT NULL)
);
--> statement-breakpoint
CREATE FUNCTION audit_contact_changes() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE changed jsonb; actor text := nullif(current_setting('app.actor_id',true),''); details jsonb;
BEGIN
 IF TG_OP='UPDATE' THEN
  SELECT coalesce(jsonb_agg(k ORDER BY k),'[]'::jsonb) INTO changed FROM jsonb_object_keys(to_jsonb(NEW)) k
  WHERE k NOT IN ('version','updated_at','authorization_at') AND to_jsonb(OLD)->k IS DISTINCT FROM to_jsonb(NEW)->k;
 ELSE changed:='[]'::jsonb;
 END IF;
 details:=jsonb_build_object('recordId',NEW.id,'fields',changed,'version',NEW.version,
  'legalBasis',NEW.legal_basis,'communication',jsonb_build_object('whatsapp',NEW.allow_whatsapp,'sms',NEW.allow_sms,'calls',NEW.allow_calls));
 INSERT INTO audit_logs(actor_id,subject_id,action,metadata) VALUES(actor,NEW.assigned_to,'contacts.'||lower(TG_OP),details);
 RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER audit_contacts ON contacts;
--> statement-breakpoint
CREATE TRIGGER audit_contacts AFTER INSERT OR UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION audit_contact_changes();
--> statement-breakpoint
CREATE TRIGGER audit_contacts_delete AFTER DELETE ON contacts FOR EACH ROW EXECUTE FUNCTION audit_business_changes();
