// Reads the location reference tables from PostgreSQL (loaded from prisma/location_data.sql).
// Server-only: the picker receives plain arrays as props.

import { db } from "@/server/db";
import type { Area, District, Division, LocationData, Upazila } from "@/server/location/types";

export async function getLocationData(): Promise<LocationData> {
  const [divisions, districts, upazilas, areas] = await Promise.all([
    db.$queryRaw<Division[]>`
      SELECT id, name, bn_name AS "bnName"
      FROM divisions
      WHERE is_active
      ORDER BY id`,
    db.$queryRaw<District[]>`
      SELECT id, division_id AS "divisionId", name, bn_name AS "bnName"
      FROM districts
      WHERE is_active
      ORDER BY id`,
    db.$queryRaw<Upazila[]>`
      SELECT id, district_id AS "districtId", name, bn_name AS "bnName"
      FROM upazilas
      WHERE is_active
      ORDER BY id`,
    // areas has no district column; its district comes through its upazila.
    db.$queryRaw<Area[]>`
      SELECT a.id, a.upazila_id AS "upazilaId", u.district_id AS "districtId", a.name, a.bn_name AS "bnName"
      FROM areas a
      JOIN upazilas u ON u.id = a.upazila_id
      WHERE a.is_active
      ORDER BY a.id`,
  ]);
  return { divisions, districts, upazilas, areas };
}
