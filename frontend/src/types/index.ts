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
