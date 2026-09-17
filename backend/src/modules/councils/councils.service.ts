import { query } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { CouncilRow } from "./councils.types";

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
