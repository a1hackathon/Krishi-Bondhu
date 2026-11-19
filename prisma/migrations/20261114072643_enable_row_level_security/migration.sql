-- Deny by default: any role other than the table owner sees no rows until explicit policies are added
-- with the login feature. The application connects as the owner, so it is not affected by this change.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
