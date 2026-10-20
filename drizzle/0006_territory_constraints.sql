-- Custom SQL migration file, put your code below! --
ALTER TABLE communities ADD CONSTRAINT locality_kind CHECK (kind IN ('distrito','bairro','engenho','sitio','comunidade_rural'));
--> statement-breakpoint
ALTER TABLE communities ADD CONSTRAINT locality_geom_valid CHECK (geom IS NULL OR (ST_SRID(geom)=4326 AND ST_IsValid(geom) AND NOT ST_IsEmpty(geom)));
--> statement-breakpoint
ALTER TABLE activities ADD CONSTRAINT activity_geom_point CHECK (geom IS NULL OR (GeometryType(geom)='POINT' AND ST_IsValid(geom) AND NOT ST_IsEmpty(geom)));
--> statement-breakpoint
ALTER TABLE territorial_boundaries ADD CONSTRAINT boundary_geom_polygon CHECK (GeometryType(geom) IN ('POLYGON','MULTIPOLYGON') AND ST_IsValid(geom) AND NOT ST_IsEmpty(geom));
--> statement-breakpoint
CREATE INDEX communities_geom_gist ON communities USING gist (geom);
--> statement-breakpoint
CREATE INDEX activities_geom_gist ON activities USING gist (geom);
--> statement-breakpoint
CREATE INDEX boundaries_geom_gist ON territorial_boundaries USING gist (geom);
--> statement-breakpoint
CREATE TRIGGER audit_territorial_boundaries AFTER INSERT OR UPDATE OR DELETE ON territorial_boundaries FOR EACH ROW EXECUTE FUNCTION audit_business_changes();
