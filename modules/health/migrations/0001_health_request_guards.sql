CREATE FUNCTION health.guard_request_release() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'HEALTH_VERSION_REQUIRED'; END IF;
 IF NEW.restricted=false AND NOT EXISTS(SELECT 1 FROM health.legal_records l WHERE l.request_id=NEW.id AND l.revoked_at IS NULL AND (l.kind='outra_base_aprovada' OR l.consented=true)) THEN RAISE EXCEPTION 'HEALTH_LEGAL_BASIS_REQUIRED'; END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER health_request_release BEFORE INSERT OR UPDATE ON health.requests FOR EACH ROW EXECUTE FUNCTION health.guard_request_release();
