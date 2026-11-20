-- A password reset request has only the opaque token hash before the token is
-- claimed. Permit marking that exact token used; row/column scope remains narrow.
DROP POLICY "password_reset_update_self" ON "password_reset_tokens";
CREATE POLICY "password_reset_update_scoped" ON "password_reset_tokens" FOR UPDATE TO app_runtime
  USING (
    "userId"::text = NULLIF(current_setting('app.user_id', true), '')
    OR "tokenHash" = NULLIF(current_setting('app.password_reset_token_hash', true), '')
  )
  WITH CHECK (
    "userId"::text = NULLIF(current_setting('app.user_id', true), '')
    OR "tokenHash" = NULLIF(current_setting('app.password_reset_token_hash', true), '')
  );
