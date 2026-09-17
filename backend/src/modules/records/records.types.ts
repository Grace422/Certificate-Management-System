export type RecordType = "birth" | "death" | "marriage";

export interface CivilRecordRow {
  id: string;
  record_type: RecordType;
  full_name: string;
  date_of_birth: string | null;
  place_of_birth: string | null;
  registration_number: string | null;
  registered_council_id: string;
  registered_council_name?: string; // populated via JOIN on search/get
  record_data: Record<string, unknown>;
  document_scan_url: string | null;
  linked_user_id: string | null;
  created_at: string;
}

export interface PublicCivilRecord {
  id: string;
  recordType: RecordType;
  fullName: string;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  registrationNumber: string | null;
  registeredCouncilId: string;
  registeredCouncilName?: string;
  documentScanUrl: string | null;
}

export function toPublicRecord(row: CivilRecordRow): PublicCivilRecord {
  return {
    id: row.id,
    recordType: row.record_type,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    placeOfBirth: row.place_of_birth,
    registrationNumber: row.registration_number,
    registeredCouncilId: row.registered_council_id,
    registeredCouncilName: row.registered_council_name,
    documentScanUrl: row.document_scan_url
    // record_data (parents' names, spouse, etc.) deliberately NOT exposed
    // in list/search results - only on a direct getById fetch, since it may
    // contain other people's personal data (e.g. parents on a birth record).
  };
}
