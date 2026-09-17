/**
 * Domain types for the Cameroon Civil Registry (CivilReg) frontend.
 * Keep these aligned with your Express/Sequelize (or Prisma) models.
 */

/** The 10 regions of Cameroon. */
export type Region =
  | 'Adamawa'
  | 'Centre'
  | 'East'
  | 'Far North'
  | 'Littoral'
  | 'North'
  | 'North West'
  | 'South'
  | 'South West'
  | 'West';

export type UserRole = 'CITIZEN' | 'AGENT' | 'ADMIN' | 'SUPER_ADMIN';

export type CertificateType = 'BIRTH' | 'DEATH' | 'MARRIAGE';

/** Why the citizen is asking for a document. */
export type RequestType = 'COPY' | 'LOSS_DECLARATION';

export type RequestStatus =
  | 'PENDING'      // submitted, not yet picked up by an agent
  | 'UNDER_REVIEW' // agent is verifying against the archive
  | 'APPROVED'     // record found + verified
  | 'DISPATCHED'   // document sent to the pickup office
  | 'READY'        // available for collection at pickup office
  | 'COLLECTED'    // citizen has taken it
  | 'REJECTED';    // no record found / invalid request

/** A geographic point (WGS84). */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Municipal building / civil status centre. */
export interface MunicipalOffice extends GeoPoint {
  id: string;
  name: string;          // e.g. "Buea Council - Civil Status Registry"
  region: Region;
  division: string;      // department, e.g. "Fako"
  council: string;       // commune, e.g. "Buea"
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  /** Injected client-side after a nearest-office computation (km). */
  distanceKm?: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  nationalId?: string | null;
  dateOfBirth?: string | null;   // ISO date
  placeOfBirth?: string | null;
  region?: Region | null;
  /** Last known location the citizen consented to share. */
  latitude?: number | null;
  longitude?: number | null;
  mfaEnabled: boolean;
  emailVerified: boolean;
  createdAt: string;
}

/** A row from the civil-status archive that the admin bulk-uploads. */
export interface CertificateRecord {
  id: string;
  certificateNumber: string;
  type: CertificateType;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  fatherName?: string | null;
  motherName?: string | null;
  registrationDate?: string | null;
  issuingOfficeId: string;
  issuingOffice?: MunicipalOffice;
}

export interface CertificateRequest {
  id: string;
  reference: string;               // human-readable tracking code, e.g. CR-2026-000134
  userId: string;
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>;
  requestType: RequestType;
  certificateType: CertificateType;
  status: RequestStatus;

  // Search payload used by the backend matching algorithm
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  fatherName?: string | null;
  motherName?: string | null;
  certificateNumber?: string | null;

  copies: number;
  reason?: string | null;

  /** Where the citizen was when filing (for nearest-office routing). */
  requesterLatitude?: number | null;
  requesterLongitude?: number | null;

  /** Office that holds the original record. */
  originOfficeId?: string | null;
  originOffice?: MunicipalOffice | null;

  /** Office the document is dispatched to for collection. */
  pickupOfficeId?: string | null;
  pickupOffice?: MunicipalOffice | null;

  matchedRecordId?: string | null;
  rejectionReason?: string | null;
  attachments?: RequestAttachment[];
  timeline?: RequestEvent[];

  createdAt: string;
  updatedAt: string;
}

export interface RequestAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url?: string;
  createdAt: string;
}

export interface RequestEvent {
  id: string;
  status: RequestStatus;
  note?: string | null;
  actorName?: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* API envelopes                                                       */
/* ------------------------------------------------------------------ */

/** Standard success envelope. Adjust if your backend differs. */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Login can either succeed outright or demand a second factor. */
export interface LoginResult {
  mfaRequired: boolean;
  /** Short-lived token proving step-1 succeeded; posted back with the OTP. */
  mfaToken?: string;
  /** Present only when mfaRequired === false. */
  accessToken?: string;
  user?: User;
}

export interface AuthSession {
  accessToken?: string;
  user: User;
}

export interface MfaSetupInfo {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl?: string;
  recoveryCodes?: string[];
}

export interface AdminStats {
  totalRequests: number;
  pending: number;
  underReview: number;
  approved: number;
  dispatched: number;
  rejected: number;
  totalCitizens: number;
  totalRecords: number;
  totalOffices: number;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}
