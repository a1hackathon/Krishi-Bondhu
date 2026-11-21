-- Officer verification for Admins. Runtime roles keep no direct UPDATE on
-- status/officerVerifiedAt; they can only call these narrow functions, which
-- re-check on the server that the caller is an active Admin.

CREATE OR REPLACE FUNCTION app_current_admin_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id FROM users u
  WHERE u.id::text = NULLIF(current_setting('app.user_id', true), '')
    AND u.role = 'ADMIN'
    AND u.status = 'ACTIVE'
    AND u."disabledAt" IS NULL
$$;

CREATE OR REPLACE FUNCTION admin_list_pending_officers()
  RETURNS TABLE (id text, "fullName" text, "phoneNumber" text, "createdAt" timestamptz)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id::text, u."fullName"::text, u."phoneNumber"::text, u."createdAt"
  FROM users u
  WHERE app_current_admin_id() IS NOT NULL
    AND u.role = 'OFFICER'
    AND u.status = 'PENDING_VERIFICATION'
    AND u."disabledAt" IS NULL
  ORDER BY u."createdAt" ASC
$$;

CREATE OR REPLACE FUNCTION admin_verify_officer(target_id uuid) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  affected integer;
BEGIN
  IF app_current_admin_id() IS NULL THEN
    RETURN false;
  END IF;

  UPDATE users
  SET status = 'ACTIVE', "officerVerifiedAt" = now(), "updatedAt" = now()
  WHERE id = target_id
    AND role = 'OFFICER'
    AND status = 'PENDING_VERIFICATION'
    AND "disabledAt" IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END
$$;

REVOKE ALL ON FUNCTION app_current_admin_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_list_pending_officers() FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_verify_officer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_list_pending_officers() TO app_runtime;
GRANT EXECUTE ON FUNCTION admin_verify_officer(uuid) TO app_runtime;
