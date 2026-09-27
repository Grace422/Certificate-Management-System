import { query } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { CouncilRow } from "./councils.types";

const CAMEROON_REGIONS = ["Adamawa", "Centre", "East", "Far North", "Littoral", "North", "Northwest", "West", "South", "Southwest"];

// ST_X/ST_Y extract lon/lat back out of the `geography(Point)` column for
// the API response - the DB stores/indexes geography, but clients want
// plain numbers.
const SELECT_COLUMNS = `
  id, name, region, division, address, contact_phone, is_active,
  ST_X(location::geometry) AS longitude,
  ST_Y(location::geometry) AS latitude
`;

export async function list(region?: string): Promise<CouncilRow[]> {
  const result = region
    ? await query<CouncilRow>(`SELECT ${SELECT_COLUMNS} FROM councils WHERE region = $1 AND is_active = true ORDER BY name`, [region])
    : await query<CouncilRow>(`SELECT ${SELECT_COLUMNS} FROM councils WHERE is_active = true ORDER BY region, name`);
  return result.rows;
}

export async function getById(id: string): Promise<CouncilRow> {
  const result = await query<CouncilRow>(`SELECT ${SELECT_COLUMNS} FROM councils WHERE id = $1`, [id]);
  if (result.rowCount === 0) throw ApiError.notFound("Council not found");
  return result.rows[0];
}

/**
 * The core geolocation mechanism (FR9): given a citizen's coordinates,
 * returns the `limit` closest active councils ordered by distance. Uses
 * PostGIS's <-> "distance operator", which is index-accelerated by the
 * GIST index on councils.location (see migration 003) - this stays fast
 * even with thousands of councils, unlike computing ST_Distance for every
 * row and sorting in application code.
 */
export async function findNearest(latitude: number, longitude: number, limit: number): Promise<CouncilRow[]> {
  const point = `POINT(${longitude} ${latitude})`; // PostGIS point order is (lng, lat)
  const result = await query<CouncilRow>(
    `SELECT ${SELECT_COLUMNS},
            ST_Distance(location, ST_GeogFromText($1)) AS distance_m
     FROM councils
     WHERE is_active = true
     ORDER BY location <-> ST_GeogFromText($1)
     LIMIT $2`,
    [point, limit]
  );
  return result.rows;
}

export interface CouncilBulkUploadRow {
  name: string;
  region: string;
  division: string;
  latitude: string;
  longitude: string;
  address?: string;
  contact_phone?: string;
}

export interface BulkUploadResult {
  insertedCount: number;
  errors: { row: number; message: string }[];
}

/**
 * Bulk-imports municipal council locations (the "courthouse" dataset).
 * Same partial-success philosophy as records.bulkUpload: a handful of
 * malformed rows (bad coordinates, unrecognized region) shouldn't block
 * the rest of a real ~360-council dataset from loading. Upserts by name +
 * region so re-uploading an updated dataset doesn't create duplicates.
 */
export async function bulkUpload(rows: CouncilBulkUploadRow[]): Promise<BulkUploadResult> {
  const errors: BulkUploadResult["errors"] = [];
  let insertedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      if (!row.name?.trim()) throw new Error("name is required");
      if (!CAMEROON_REGIONS.includes(row.region?.trim())) {
        throw new Error(`Invalid region "${row.region}" (must be one of: ${CAMEROON_REGIONS.join(", ")})`);
      }
      if (!row.division?.trim()) throw new Error("division is required");

      const lat = Number(row.latitude);
      const lng = Number(row.longitude);
      if (Number.isNaN(lat) || lat < -90 || lat > 90) throw new Error(`Invalid latitude "${row.latitude}"`);
      if (Number.isNaN(lng) || lng < -180 || lng > 180) throw new Error(`Invalid longitude "${row.longitude}"`);

      const point = `POINT(${lng} ${lat})`;

      // Upsert on (name, region): re-uploading an updated dataset refreshes
      // coordinates/address for existing councils rather than duplicating them.
      const existing = await query<{ id: string }>(
        "SELECT id FROM councils WHERE name ILIKE $1 AND region = $2",
        [row.name.trim(), row.region.trim()]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        await query(
          `UPDATE councils SET division = $1, location = ST_GeogFromText($2), address = $3, contact_phone = $4
           WHERE id = $5`,
          [row.division.trim(), point, row.address?.trim() || null, row.contact_phone?.trim() || null, existing.rows[0].id]
        );
      } else {
        await query(
          `INSERT INTO councils (name, region, division, location, address, contact_phone)
           VALUES ($1, $2, $3, ST_GeogFromText($4), $5, $6)`,
          [row.name.trim(), row.region.trim(), row.division.trim(), point, row.address?.trim() || null, row.contact_phone?.trim() || null]
        );
      }
      insertedCount++;
    } catch (err) {
      errors.push({ row: rowNum, message: (err as Error).message });
    }
  }

  return { insertedCount, errors };
}
