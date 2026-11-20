-- Identity fields. Existing accounts have no password and must set one before
-- they can use password sign-in; no plaintext/default password is introduced.
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED');

ALTER TABLE "users"
  ADD COLUMN "passwordHash" VARCHAR(100),
  ADD COLUMN "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "officerVerifiedAt" TIMESTAMPTZ(6),
  ADD COLUMN "disabledAt" TIMESTAMPTZ(6);

CREATE TABLE "auth_sessions" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "auth_sessions_tokenHash_key" ON "auth_sessions"("tokenHash");
CREATE INDEX "auth_sessions_userId_expiresAt_idx" ON "auth_sessions"("userId", "expiresAt");

CREATE TABLE "password_reset_tokens" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "usedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_userId_expiresAt_idx" ON "password_reset_tokens"("userId", "expiresAt");

CREATE TABLE "auth_rate_limits" (
  "keyHash" CHAR(64) NOT NULL,
  "windowStartedAt" TIMESTAMPTZ(6) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("keyHash")
);

-- The web runtime is not a table owner and must pass an explicit transaction-local
-- context for every auth query. Phone lookups can see only the requested phone.
DROP POLICY IF EXISTS "user_isolation" ON "users";
CREATE POLICY "users_select_scoped" ON "users" FOR SELECT TO app_runtime
  USING (
    "id"::text = NULLIF(current_setting('app.user_id', true), '')
    OR "phoneNumber" = NULLIF(current_setting('app.auth_phone', true), '')
  );
CREATE POLICY "users_signup_insert" ON "users" FOR INSERT TO app_runtime
  WITH CHECK (current_setting('app.auth_action', true) = 'signup');
CREATE POLICY "users_self_update" ON "users" FOR UPDATE TO app_runtime
  USING ("id"::text = NULLIF(current_setting('app.user_id', true), ''))
  WITH CHECK ("id"::text = NULLIF(current_setting('app.user_id', true), ''));

ALTER TABLE "auth_sessions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_sessions_select_scoped" ON "auth_sessions" FOR SELECT TO app_runtime
  USING (
    "userId"::text = NULLIF(current_setting('app.user_id', true), '')
    OR "tokenHash" = NULLIF(current_setting('app.session_token_hash', true), '')
  );
CREATE POLICY "auth_sessions_insert_self" ON "auth_sessions" FOR INSERT TO app_runtime
  WITH CHECK ("userId"::text = NULLIF(current_setting('app.user_id', true), ''));
CREATE POLICY "auth_sessions_delete_scoped" ON "auth_sessions" FOR DELETE TO app_runtime
  USING (
    "userId"::text = NULLIF(current_setting('app.user_id', true), '')
    OR "tokenHash" = NULLIF(current_setting('app.session_token_hash', true), '')
  );

ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "password_reset_select_scoped" ON "password_reset_tokens" FOR SELECT TO app_runtime
  USING (
    "userId"::text = NULLIF(current_setting('app.user_id', true), '')
    OR "tokenHash" = NULLIF(current_setting('app.password_reset_token_hash', true), '')
  );
CREATE POLICY "password_reset_insert_self" ON "password_reset_tokens" FOR INSERT TO app_runtime
  WITH CHECK ("userId"::text = NULLIF(current_setting('app.user_id', true), ''));
CREATE POLICY "password_reset_update_self" ON "password_reset_tokens" FOR UPDATE TO app_runtime
  USING ("userId"::text = NULLIF(current_setting('app.user_id', true), ''))
  WITH CHECK ("userId"::text = NULLIF(current_setting('app.user_id', true), ''));

ALTER TABLE "auth_rate_limits" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_rate_limits_key_scoped" ON "auth_rate_limits" FOR ALL TO app_runtime
  USING ("keyHash" = NULLIF(current_setting('app.rate_limit_key_hash', true), ''))
  WITH CHECK ("keyHash" = NULLIF(current_setting('app.rate_limit_key_hash', true), ''));

-- Limit runtime capabilities as well as rows. Admin status/role changes and
-- destructive actions will get a separate, explicit authorization path later.
REVOKE SELECT, INSERT, UPDATE, DELETE ON "users" FROM app_runtime;
GRANT SELECT, INSERT ON "users" TO app_runtime;
GRANT UPDATE ("fullName", "passwordHash", "updatedAt") ON "users" TO app_runtime;
GRANT SELECT, INSERT, DELETE ON "auth_sessions" TO app_runtime;
GRANT SELECT, INSERT, UPDATE ("usedAt") ON "password_reset_tokens" TO app_runtime;
GRANT SELECT, INSERT, UPDATE ON "auth_rate_limits" TO app_runtime;
