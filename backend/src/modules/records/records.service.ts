import { query } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { CivilRecordRow, RecordType, BirthRecordData } from "./records.types";

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
    `SELECT cr.*, c.name AS registered_council_name, c.region AS registered_council_region
     FROM civil_records cr
     JOIN councils c ON c.id = cr.registered_council_id
     WHERE cr.id = $1`,
    [id]
  );
  if (result.rowCount === 0) throw ApiError.notFound("Civil record not found");
  return result.rows[0];
}

/**
 * CSV row shape for bulk upload. Modelled directly on the real Cameroon
 * "Acte de Naissance / Birth Certificate" form fields for birth records
 * (child + both parents' full details); death/marriage rows only need the
 * generic columns (full_name/date/place) since no equivalent template was
 * provided for those types. All father- and mother- prefixed columns plus
 * the administrative ones are optional and, when present, are packed into
 * record_data JSONB rather than becoming their own table columns - see
 * BirthRecordData.
 */
export interface BulkUploadRow {
  record_type: string;
  // Generic fields - required for death/marriage; for birth, full_name is
  // DERIVED from child_surname + child_given_names if not given directly.
  full_name?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  registration_number?: string;
  council_name: string; // resolved to registered_council_id by exact (case-insensitive) name match

  // Birth-specific: child identity (mirrors "Nom de l'enfant" / "Prénoms de l'enfant")
  child_surname?: string;
  child_given_names?: string;
  sex?: string; // "M" | "F"

  // Administrative (Region / Department / Arrondissement / Centre d'état civil)
  region?: string;
  department?: string;
  arrondissement?: string;
  centre_etat_civil?: string;

  // Father
  father_name?: string;
  father_birthplace?: string;
  father_birthdate?: string;
  father_residence?: string;
  father_profession?: string;
  father_nationality?: string;
  father_id_reference?: string;

  // Mother
  mother_name?: string;
  mother_birthplace?: string;
  mother_birthdate?: string;
  mother_residence?: string;
  mother_profession?: string;
  mother_nationality?: string;
  mother_id_reference?: string;

  // Sign-off
  declarant?: string;
  registrar_name?: string;
  secretary_name?: string;
  date_drawn_up?: string;
}

export interface BulkUploadResult {
  insertedCount: number;
  errors: { row: number; message: string }[];
}

function buildRecordData(row: BulkUploadRow): BirthRecordData {
  const data: BirthRecordData = {};
  if (row.sex) data.sex = row.sex.trim().toUpperCase() === "F" ? "F" : "M";
  if (row.region) data.region = row.region.trim();
  if (row.department) data.department = row.department.trim();
  if (row.arrondissement) data.arrondissement = row.arrondissement.trim();
  if (row.centre_etat_civil) data.centreEtatCivil = row.centre_etat_civil.trim();

  const father = {
    name: row.father_name?.trim(),
    birthplace: row.father_birthplace?.trim(),
    birthdate: row.father_birthdate?.trim(),
    residence: row.father_residence?.trim(),
    profession: row.father_profession?.trim(),
    nationality: row.father_nationality?.trim(),
    idReference: row.father_id_reference?.trim()
  };
  if (Object.values(father).some(Boolean)) data.father = father;

  const mother = {
    name: row.mother_name?.trim(),
    birthplace: row.mother_birthplace?.trim(),
    birthdate: row.mother_birthdate?.trim(),
    residence: row.mother_residence?.trim(),
    profession: row.mother_profession?.trim(),
    nationality: row.mother_nationality?.trim(),
    idReference: row.mother_id_reference?.trim()
  };
  if (Object.values(mother).some(Boolean)) data.mother = mother;

  if (row.declarant) data.declarant = row.declarant.trim();
  if (row.registrar_name) data.registrarName = row.registrar_name.trim();
  if (row.secretary_name) data.secretaryName = row.secretary_name.trim();
  if (row.date_drawn_up) data.dateDrawnUp = row.date_drawn_up.trim();

  return data;
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
      if (!row.council_name?.trim()) throw new Error("council_name is required");

      // full_name is derived from child_surname + child_given_names when
      // not given directly - this is the normal case for birth rows, which
      // carry the child's name split into two fields like the real form.
      const fullName = row.full_name?.trim()
        || [row.child_surname?.trim(), row.child_given_names?.trim()].filter(Boolean).join(" ");
      if (!fullName) throw new Error("full_name (or child_surname + child_given_names) is required");

      const councilRes = await query<{ id: string }>(
        "SELECT id FROM councils WHERE name ILIKE $1 LIMIT 1",
        [row.council_name.trim()]
      );
      if (councilRes.rowCount === 0) {
        throw new Error(`No council found matching "${row.council_name}"`);
      }

      const recordData = buildRecordData(row);

      await query(
        `INSERT INTO civil_records (record_type, full_name, date_of_birth, place_of_birth, registration_number, registered_council_id, record_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          row.record_type,
          fullName,
          row.date_of_birth || null,
          row.place_of_birth || null,
          row.registration_number || null,
          councilRes.rows[0].id,
          JSON.stringify(recordData)
        ]
      );
      insertedCount++;
    } catch (err) {
      errors.push({ row: rowNum, message: (err as Error).message });
    }
  }

  return { insertedCount, errors };
}
