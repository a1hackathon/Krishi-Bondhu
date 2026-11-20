import "server-only";

import type { UserRole } from "@/generated/prisma/client";
import { withAuthRlsContext } from "@/server/auth/rls";

export type AccountLocation = {
  divisionId: number;
  divisionName: string;
  divisionBnName: string;
  districtId: number;
  districtName: string;
  districtBnName: string;
  upazilaId: number;
  upazilaName: string;
  upazilaBnName: string;
  areaId: number | null;
  areaName: string | null;
  areaBnName: string | null;
};

export type AccountProfile = {
  id: string;
  phoneNumber: string;
  fullName: string;
  role: UserRole;
  location: AccountLocation | null;
};

type ProfileRow = {
  id: string;
  phoneNumber: string;
  fullName: string;
  role: UserRole;
  divisionId: number | null;
  divisionName: string | null;
  divisionBnName: string | null;
  districtId: number | null;
  districtName: string | null;
  districtBnName: string | null;
  upazilaId: number | null;
  upazilaName: string | null;
  upazilaBnName: string | null;
  areaId: number | null;
  areaName: string | null;
  areaBnName: string | null;
};

export async function getAccountProfile(userId: string): Promise<AccountProfile | null> {
  const rows = await withAuthRlsContext({ userId }, (tx) => tx.$queryRaw<ProfileRow[]>`
    SELECT
      u.id,
      u."phoneNumber",
      u."fullName",
      u.role,
      d.division_id AS "divisionId",
      dv.name AS "divisionName",
      dv.bn_name AS "divisionBnName",
      d.id AS "districtId",
      d.name AS "districtName",
      d.bn_name AS "districtBnName",
      z.id AS "upazilaId",
      z.name AS "upazilaName",
      z.bn_name AS "upazilaBnName",
      a.id AS "areaId",
      a.name AS "areaName",
      a.bn_name AS "areaBnName"
    FROM users u
    LEFT JOIN upazilas z ON z.id = u."upazilaId"
    LEFT JOIN districts d ON d.id = z.district_id
    LEFT JOIN divisions dv ON dv.id = d.division_id
    LEFT JOIN areas a ON a.id = u."areaId" AND a.upazila_id = z.id
    WHERE u.id = ${userId}
    LIMIT 1
  `);

  const row = rows[0];
  if (!row) return null;
  const location = row.upazilaId !== null && row.divisionId !== null && row.districtId !== null
    ? {
        divisionId: row.divisionId,
        divisionName: row.divisionName ?? "",
        divisionBnName: row.divisionBnName ?? "",
        districtId: row.districtId,
        districtName: row.districtName ?? "",
        districtBnName: row.districtBnName ?? "",
        upazilaId: row.upazilaId,
        upazilaName: row.upazilaName ?? "",
        upazilaBnName: row.upazilaBnName ?? "",
        areaId: row.areaId,
        areaName: row.areaName,
        areaBnName: row.areaBnName,
      }
    : null;

  return { id: row.id, phoneNumber: row.phoneNumber, fullName: row.fullName, role: row.role, location };
}

export async function updateAccountName(userId: string, firstName: string, lastName: string): Promise<boolean> {
  return withAuthRlsContext({ userId }, async (tx) => {
    const result = await tx.user.updateMany({
      where: { id: userId },
      data: { fullName: `${firstName} ${lastName}`, updatedAt: new Date() },
    });
    return result.count === 1;
  });
}

export async function updateAccountLocation(
  userId: string,
  selection: { divisionId: number; districtId: number; upazilaId: number; areaId: number | null },
): Promise<boolean> {
  return withAuthRlsContext({ userId }, async (tx) => {
    const matched = await tx.$queryRaw<{ id: number }[]>`
      SELECT z.id
      FROM upazilas z
      JOIN districts d ON d.id = z.district_id
      JOIN divisions dv ON dv.id = d.division_id
      WHERE z.id = ${selection.upazilaId}
        AND d.id = ${selection.districtId}
        AND dv.id = ${selection.divisionId}
        AND z.is_active = TRUE
        AND d.is_active = TRUE
        AND dv.is_active = TRUE
        AND (
          (${selection.areaId}::INTEGER IS NOT NULL AND EXISTS (
            SELECT 1 FROM areas a
            WHERE a.id = ${selection.areaId} AND a.upazila_id = z.id AND a.is_active = TRUE
          ))
          OR (${selection.areaId}::INTEGER IS NULL AND NOT EXISTS (
            SELECT 1 FROM areas a WHERE a.upazila_id = z.id AND a.is_active = TRUE
          ))
        )
      LIMIT 1
    `;
    if (!matched.length) return false;

    const result = await tx.user.updateMany({
      where: { id: userId },
      data: { upazilaId: selection.upazilaId, areaId: selection.areaId, updatedAt: new Date() },
    });
    return result.count === 1;
  });
}
