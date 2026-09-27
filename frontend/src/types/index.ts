export type Role = "citizen" | "origin_admin" | "destination_admin" | "super_admin";

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  mfaEnabled: boolean;
  councilId: string | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  details?: unknown;
}

// Mirrors backend BirthRecordData - the fields on the real Cameroon
// "Acte de Naissance / Birth Certificate" form beyond the basic name/DOB.
export interface BirthRecordData {
  sex?: "M" | "F";
  region?: string;
  department?: string;
  arrondissement?: string;
  centreEtatCivil?: string;
  father?: {
    name?: string;
    birthplace?: string;
    birthdate?: string;
    residence?: string;
    profession?: string;
    nationality?: string;
    idReference?: string;
  };
  mother?: {
    name?: string;
    birthplace?: string;
    birthdate?: string;
    residence?: string;
    profession?: string;
    nationality?: string;
    idReference?: string;
  };
  declarant?: string;
  registrarName?: string;
  secretaryName?: string;
  dateDrawnUp?: string;
}

export interface FullCivilRecord {
  id: string;
  recordType: "birth" | "death" | "marriage";
  fullName: string;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  registrationNumber: string | null;
  registeredCouncilId: string;
  registeredCouncilName?: string;
  registeredCouncilRegion?: string;
  documentScanUrl: string | null;
  recordData: BirthRecordData | Record<string, unknown>;
}

export interface CertificateView {
  request: {
    id: string;
    status: string;
    requestedAt: string;
    completedAt: string | null;
  };
  record: FullCivilRecord;
  originCouncilName: string;
  destinationCouncilName: string | null;
}
