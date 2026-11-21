import "server-only";

import { withAuthRlsContext } from "@/server/auth/rls";

export type PendingOfficer = {
  id: string;
  fullName: string;
  phoneNumber: string;
  createdAt: string;
};

// The database functions re-check that the caller is an active Admin, so these
// wrappers only forward the caller's session identity.
export async function listPendingOfficers(adminId: string): Promise<PendingOfficer[]> {
  const rows = await withAuthRlsContext({ userId: adminId }, (tx) => tx.$queryRaw<
    { id: string; fullName: string; phoneNumber: string; createdAt: Date }[]
  >`SELECT * FROM admin_list_pending_officers()`);
  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    phoneNumber: row.phoneNumber,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function verifyOfficer(adminId: string, officerId: string): Promise<boolean> {
  const rows = await withAuthRlsContext({ userId: adminId }, (tx) => tx.$queryRaw<{ ok: boolean }[]>`
    SELECT admin_verify_officer(${officerId}::uuid) AS ok
  `);
  return rows[0]?.ok === true;
}
