-- Custom SQL migration file, put your code below! --
-- Snapshot only what is already documented. Migration time is not a new consent date.
INSERT INTO contact_authorizations(contact_id,contact_version,legal_basis,purpose,legal_evidence,allow_whatsapp,allow_sms,allow_calls,communication_evidence,recorded_by,source)
SELECT id,version,legal_basis,purpose,legal_evidence,allow_whatsapp,allow_sms,allow_calls,communication_evidence,NULL,'migracao' FROM contacts;
--> statement-breakpoint
CREATE FUNCTION capture_contact_authorizations() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' OR ROW(NEW.legal_basis,NEW.purpose,NEW.legal_evidence,NEW.allow_whatsapp,NEW.allow_sms,NEW.allow_calls,NEW.communication_evidence)
 IS DISTINCT FROM ROW(OLD.legal_basis,OLD.purpose,OLD.legal_evidence,OLD.allow_whatsapp,OLD.allow_sms,OLD.allow_calls,OLD.communication_evidence) THEN
  INSERT INTO contact_authorizations(contact_id,contact_version,legal_basis,purpose,legal_evidence,allow_whatsapp,allow_sms,allow_calls,communication_evidence,recorded_by,source)
  VALUES(NEW.id,NEW.version,NEW.legal_basis,NEW.purpose,NEW.legal_evidence,NEW.allow_whatsapp,NEW.allow_sms,NEW.allow_calls,NEW.communication_evidence,nullif(current_setting('app.actor_id',true),''),CASE WHEN TG_OP='INSERT' THEN 'cadastro' ELSE 'alteracao' END);
 END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER capture_contact_authorizations AFTER INSERT OR UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION capture_contact_authorizations();
--> statement-breakpoint
CREATE TRIGGER authorizations_no_modification BEFORE UPDATE OR DELETE ON contact_authorizations FOR EACH ROW EXECUTE FUNCTION audit_append_only();
--> statement-breakpoint
CREATE TRIGGER authorizations_no_truncate BEFORE TRUNCATE ON contact_authorizations FOR EACH STATEMENT EXECUTE FUNCTION audit_append_only();
--> statement-breakpoint
ALTER TABLE contacts ADD CONSTRAINT contacts_name_length CHECK(length(trim(name)) BETWEEN 1 AND 150) NOT VALID;
--> statement-breakpoint
ALTER TABLE contacts ADD CONSTRAINT contacts_optional_lengths CHECK((address IS NULL OR length(address)<=500) AND (notes IS NULL OR length(notes)<=1500)) NOT VALID;
--> statement-breakpoint
ALTER TABLE contacts ADD CONSTRAINT contacts_version_positive CHECK(version>0);
--> statement-breakpoint
ALTER TABLE visits ADD CONSTRAINT visits_title_length CHECK(length(trim(title)) BETWEEN 1 AND 180) NOT VALID;
--> statement-breakpoint
ALTER TABLE visits ADD CONSTRAINT visits_description_length CHECK(description IS NULL OR length(description)<=2000) NOT VALID;
--> statement-breakpoint
ALTER TABLE visits ADD CONSTRAINT visits_version_positive CHECK(version>0);
--> statement-breakpoint
ALTER TABLE communities ADD CONSTRAINT communities_name_length CHECK(length(trim(name)) BETWEEN 1 AND 150) NOT VALID;
--> statement-breakpoint
ALTER TABLE communities ADD CONSTRAINT communities_version_positive CHECK(version>0);
--> statement-breakpoint
ALTER TABLE activities ADD CONSTRAINT activities_version_positive CHECK(version>0);
--> statement-breakpoint
ALTER TABLE audit_logs ADD CONSTRAINT audit_outcome_allowed CHECK(outcome IN ('success','denied','failure'));
--> statement-breakpoint
ALTER TABLE audit_logs ADD CONSTRAINT audit_metadata_object CHECK(jsonb_typeof(metadata)='object');
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT user_name_nonempty CHECK(length(trim(name)) BETWEEN 1 AND 120) NOT VALID;
--> statement-breakpoint
ALTER TABLE user_invitations ADD CONSTRAINT invitation_lifetime CHECK(expires_at>created_at AND (used_at IS NULL OR used_at>=created_at));
--> statement-breakpoint
CREATE FUNCTION audit_permission_catalog() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r jsonb;
BEGIN
 IF TG_OP='DELETE' THEN r:=to_jsonb(OLD); ELSE r:=to_jsonb(NEW); END IF;
 INSERT INTO audit_logs(actor_id,action,metadata) VALUES(nullif(current_setting('app.actor_id',true),''),TG_TABLE_NAME||'.'||lower(TG_OP),jsonb_build_object('code',r->>'code','role',r->>'role_code','permission',r->>'permission_code'));
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_roles AFTER INSERT OR UPDATE OR DELETE ON roles FOR EACH ROW EXECUTE FUNCTION audit_permission_catalog();
--> statement-breakpoint
CREATE TRIGGER audit_permissions AFTER INSERT OR UPDATE OR DELETE ON permissions FOR EACH ROW EXECUTE FUNCTION audit_permission_catalog();
--> statement-breakpoint
CREATE TRIGGER audit_role_permissions AFTER INSERT OR UPDATE OR DELETE ON role_permissions FOR EACH ROW EXECUTE FUNCTION audit_permission_catalog();
