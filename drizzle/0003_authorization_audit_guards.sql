-- Custom SQL migration file, put your code below! --
ALTER TABLE "user" ADD CONSTRAINT user_role_allowed CHECK (role IN ('administrador_geral','coordenador','assessor','analista','atendente_saude'));
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT future_health_inactive CHECK (role <> 'atendente_saude' OR active = false);
--> statement-breakpoint
CREATE UNIQUE INDEX user_email_case_insensitive ON "user" (lower(email));
--> statement-breakpoint
CREATE INDEX contacts_assigned_idx ON contacts(assigned_to);
--> statement-breakpoint
CREATE INDEX visits_assigned_idx ON visits(assigned_to);
--> statement-breakpoint
CREATE INDEX demands_assigned_idx ON demands(assigned_to);
--> statement-breakpoint
CREATE INDEX activities_assigned_idx ON activities(assigned_to);
--> statement-breakpoint
CREATE FUNCTION audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit records are append-only'; END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_no_modification BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION audit_append_only();
--> statement-breakpoint
CREATE TRIGGER audit_no_truncate BEFORE TRUNCATE ON audit_logs FOR EACH STATEMENT EXECUTE FUNCTION audit_append_only();
--> statement-breakpoint
CREATE FUNCTION audit_user_changes() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor text := nullif(current_setting('app.actor_id',true),'');
BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO audit_logs(actor_id,subject_id,action) VALUES(actor,NEW.id,'user.created');
 ELSE
  IF OLD.role IS DISTINCT FROM NEW.role THEN
   INSERT INTO audit_logs(actor_id,subject_id,action,metadata) VALUES(actor,NEW.id,'user.role.changed',jsonb_build_object('from',OLD.role,'to',NEW.role));
  END IF;
  IF OLD.active IS DISTINCT FROM NEW.active THEN
   INSERT INTO audit_logs(actor_id,subject_id,action,metadata) VALUES(actor,NEW.id,'user.status.changed',jsonb_build_object('from',OLD.active,'to',NEW.active));
  END IF;
  IF OLD.name IS DISTINCT FROM NEW.name OR OLD.email IS DISTINCT FROM NEW.email THEN
   INSERT INTO audit_logs(actor_id,subject_id,action) VALUES(actor,NEW.id,'user.updated');
  END IF;
  IF OLD.role IS DISTINCT FROM NEW.role OR OLD.active IS DISTINCT FROM NEW.active THEN
   DELETE FROM session WHERE "userId"=NEW.id;
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_user_changes AFTER INSERT OR UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION audit_user_changes();
--> statement-breakpoint
CREATE FUNCTION guard_and_audit_sessions() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor text := nullif(current_setting('app.actor_id',true),'');
BEGIN
 IF TG_OP='INSERT' THEN
  PERFORM 1 FROM "user" WHERE id=NEW."userId" AND active=true AND role IN ('administrador_geral','coordenador','assessor','analista') FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inactive user cannot start a session'; END IF;
  INSERT INTO audit_logs(actor_id,subject_id,action) VALUES(NEW."userId",NEW."userId",'auth.login');
  RETURN NEW;
 ELSE
  INSERT INTO audit_logs(actor_id,subject_id,action) VALUES(coalesce(actor,OLD."userId"),OLD."userId",'auth.session.revoked');
  RETURN OLD;
 END IF;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_session_creation BEFORE INSERT ON session FOR EACH ROW EXECUTE FUNCTION guard_and_audit_sessions();
--> statement-breakpoint
CREATE TRIGGER audit_session_revocation AFTER DELETE ON session FOR EACH ROW EXECUTE FUNCTION guard_and_audit_sessions();
--> statement-breakpoint
CREATE FUNCTION audit_password_changes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.password IS DISTINCT FROM NEW.password THEN
  INSERT INTO audit_logs(actor_id,subject_id,action) VALUES(coalesce(nullif(current_setting('app.actor_id',true),''),NEW."userId"),NEW."userId",'auth.password.changed');
 END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_password_changes AFTER UPDATE ON account FOR EACH ROW EXECUTE FUNCTION audit_password_changes();
