-- Initialize PostgreSQL extensions and roles for Enterprise Knowledge Assistant (EKA)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create analytics/reporting read-only user if needed
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'eka_readonly') THEN
      CREATE ROLE eka_readonly WITH LOGIN PASSWORD 'eka_readonly_secure_pass';
   END IF;
END
$do$;

GRANT CONNECT ON DATABASE eka_db TO eka_readonly;
GRANT USAGE ON SCHEMA public TO eka_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO eka_readonly;
