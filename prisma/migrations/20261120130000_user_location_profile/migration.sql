ALTER TABLE "users"
  ADD COLUMN "upazilaId" INTEGER,
  ADD COLUMN "areaId" INTEGER;

ALTER TABLE "users"
  ADD CONSTRAINT "users_upazilaId_fkey"
    FOREIGN KEY ("upazilaId") REFERENCES upazilas(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "users_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES areas(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "users_upazilaId_idx" ON "users"("upazilaId");
CREATE INDEX "users_areaId_idx" ON "users"("areaId");

-- Keep user edits scoped by the existing RLS policy and grant only these fields.
GRANT UPDATE ("upazilaId", "areaId") ON "users" TO app_runtime;
