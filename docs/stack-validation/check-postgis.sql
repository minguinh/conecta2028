-- Read-only. Execute on the intended Neon development branch before migrations.
SELECT name, default_version, installed_version
FROM pg_available_extensions
WHERE name = 'postgis';

-- An empty result means the extension is not available on this instance.
-- installed_version IS NULL means it is available but not yet enabled.
-- Do not run PostGIS_Full_Version() until installed_version is non-null.
