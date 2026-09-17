import { Role } from "../../middlewares/auth.middleware";

// Mirrors the `users` table. Kept close to the SQL so a schema change is
// easy to reconcile with the type.
export interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  home_council_id: string | null;
  role: Role;
  mfa_secret: string | null;
  mfa_enabled: boolean;
  is_active: boolean;
  failed_login_count: number;
  locked_until: string | null;
  created_at: string;
}

// Safe subset returned to clients - never include password_hash or mfa_secret.
export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  mfaEnabled: boolean;
  councilId: string | null; // for origin_admin/destination_admin: the council they manage
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    mfaEnabled: row.mfa_enabled,
    councilId: row.home_council_id
  };
}
