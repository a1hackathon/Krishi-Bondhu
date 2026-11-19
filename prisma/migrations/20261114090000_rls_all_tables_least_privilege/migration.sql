-- Runtime role for the application. Table owners and roles with BYPASSRLS skip row level security,
-- so the app must connect as this role (NOLOGIN here; set a password and LOGIN out of band, see README).
-- Schema changes still go through migrations; the password is never stored in this file.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime;

-- Location reference data is public read-only information for the picker.
GRANT SELECT ON divisions, districts, upazilas, areas TO app_runtime;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE upazilas ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY reference_read ON divisions FOR SELECT USING (true);
CREATE POLICY reference_read ON districts FOR SELECT USING (true);
CREATE POLICY reference_read ON upazilas FOR SELECT USING (true);
CREATE POLICY reference_read ON areas FOR SELECT USING (true);

-- Users: row level security is already enabled (deny by default). The app role gets the DML it needs;
-- per-user policies (own row only, admin role) are added with the login feature.
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO app_runtime;
