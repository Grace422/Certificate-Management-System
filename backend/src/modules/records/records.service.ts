import { query } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { CivilRecordRow, RecordType } from "./records.types";

const RECORD_TYPES: RecordType[] = ["birth", "death", "marriage"];

/**
 * Search by any combination of name/DOB/place-of-birth. Uses ILIKE for
 * partial, case-insensitive matches on text fields (citizens rarely type
 * their name exactly as archived - accents, middle names, etc.) and an
 * exact match on date of birth. Results capped at 20 - this is a lookup
 * for "find MY record", not a bulk export tool.
 */
export async function search(params: { fullName?: string; dateOfBirth?: string; placeOfBirth?: string }): Promise<CivilRecordRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.fullName) {
    values.push(`%${params.fullName}%`);
    conditions.push(`cr.full_name ILIKE $${values.length}`);
  }
  if (params.dateOfBirth) {
    values.push(params.dateOfBirth);
    conditions.push(`cr.date_of_birth = $${values.length}`);
  }
  if (params.placeOfBirth) {
    values.push(`%${params.placeOfBirth}%`);
    conditions.push(`cr.place_of_birth ILIKE $${values.length}`);
  }

  const result = await query<CivilRecordRow>(
    `SELECT cr.*, c.name AS registered_council_name
     FROM civil_records cr
     JOIN councils c ON c.id = cr.registered_council_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY cr.full_name
     LIMIT 20`,
    values
  );
  return result.rows;
}

export async function getById(id: string): Promise<CivilRecordRow> {
  const result = await query<CivilRecordRow>(
    `SELECT cr.*, c.name AS registered_council_name
     FROM civil_records cr
     JOIN councils c ON c.id = cr.registered_council_id
     WHERE cr.id = $1`,
    [id]
  );
  if (result.rowCount === 0) throw ApiError.notFound("Civil record not found");
  return result.rows[0];
}

export interface BulkUploadRow {
  record_type: string;
  full_name: string;
  date_of_birth?: string;
  place_of_birth?: string;
  registration_number?: string;
  council_name: string; // resolved to registered_council_id by exact (case-insensitive) name match
}

export interface BulkUploadResult {
  insertedCount: number;
  errors: { row: number; message: string }[];
}

/**
 * Bulk-imports civil records from a parsed CSV (Super Admin migrating
 * paper archives). Deliberately processes rows independently rather than
 * as one all-or-nothing transaction: with potentially thousands of rows
 * transcribed by hand from paper, a handful of malformed rows are expected
 * and should not block the other 99% from loading. Bad rows are reported
 * back with their row number so they can be fixed and re-submitted.
 */
export async function bulkUpload(rows: BulkUploadRow[]): Promise<BulkUploadResult> {
  const errors: BulkUploadResult["errors"] = [];
  let insertedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +1 for 0-index, +1 for the CSV header row

    try {
      if (!RECORD_TYPES.includes(row.record_type as RecordType)) {
        throw new Error(`Invalid record_type "${row.record_type}" (must be birth, death, or marriage)`);
      }
      if (!row.full_name?.trim()) throw new Error("full_name is required");
      if (!row.council_name?.trim()) throw new Error("council_name is required");

      const councilRes = await query<{ id: string }>(
        "SELECT id FROM councils WHERE name ILIKE $1 LIMIT 1",
        [row.council_name.trim()]
      );
      if (councilRes.rowCount === 0) {
        throw new Error(`No council found matching "${row.council_name}"`);
      }

      await query(
        `INSERT INTO civil_records (record_type, full_name, date_of_birth, place_of_birth, registration_number, registered_council_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          row.record_type,
          row.full_name.trim(),
          row.date_of_birth || null,
          row.place_of_birth || null,
          row.registration_number || null,
          councilRes.rows[0].id
        ]
      );
      insertedCount++;
    } catch (err) {
      errors.push({ row: rowNum, message: (err as Error).message });
    }
  }

  return { insertedCount, errors };
}
