export type RecordType = "birth" | "death" | "marriage";

// Shape of record_data for a birth record - mirrors the actual bilingual
// (French/English) "Acte de Naissance / Birth Certificate" form used by
// Cameroon civil status registries: region/department/arrondissement,
// the registration centre, both parents' full details, and the
// registrar/secretary who drew it up. Kept as JSONB rather than columns
// since death/marriage records use a different, smaller field set.
export interface BirthRecordData {
  sex?: "M" | "F";
  region?: string;
  department?: string;
  arrondissement?: string;
  centreEtatCivil?: string;       // Centre d'état civil (registration centre)
  father?: {
    name?: string;
    birthplace?: string;          // Né à
    birthdate?: string;           // Le (date)
    residence?: string;           // Domicilié à
    profession?: string;
    nationality?: string;
    idReference?: string;         // Document de référence
  };
  mother?: {
    name?: string;
    birthplace?: string;          // Née à
    birthdate?: string;
    residence?: string;
    profession?: string;
    nationality?: string;
    idReference?: string;
  };
  declarant?: string;              // Sur la déclaration de
  registrarName?: string;          // Officier d'état civil
  secretaryName?: string;          // Secrétaire d'état civil
  dateDrawnUp?: string;            // Dressé le
}

export interface CivilRecordRow {
  id: string;
  record_type: RecordType;
  full_name: string;
  date_of_birth: string | null;
  place_of_birth: string | null;
  registration_number: string | null;
  registered_council_id: string;
  registered_council_name?: string; // populated via JOIN on search/get
  registered_council_region?: string;
  record_data: BirthRecordData | Record<string, unknown>;
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
    // in list/search results - only via toFullCertificate(), gated to the
    // record's own citizen and only once their request is ready/completed.
  };
}

// Full detail, including record_data - used ONLY by the certificate view
// (GET /requests/:id/certificate), never by search/list, since record_data
// contains other people's personal data (parents' names, IDs, etc.).
export interface FullCivilRecord extends PublicCivilRecord {
  recordData: BirthRecordData | Record<string, unknown>;
  registeredCouncilRegion?: string;
}

export function toFullRecord(row: CivilRecordRow): FullCivilRecord {
  return {
    ...toPublicRecord(row),
    recordData: row.record_data,
    registeredCouncilRegion: row.registered_council_region
  };
}
