import bcrypt from "bcrypt";
import { query } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { generateMfaSecret } from "../../utils/mfa";
import { UserRow, PublicUser, toPublicUser } from "./users.types";

const BCRYPT_ROUNDS = 12;

interface CreateAdminInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "origin_admin" | "destination_admin" | "super_admin";
  councilId?: string;
}

/**
 * Provisions a staff account. MFA is intentionally left disabled here - the
 * account holder completes MFA enrollment on their own first login (see
 * auth.service.login's requiresSetup branch), so Super Admin never
 * handles or sees the other person's TOTP secret.
 */
export async function createAdmin(input: CreateAdminInput): Promise<PublicUser> {
  const existing = await query("SELECT id FROM users WHERE email = $1", [input.email]);
  if ((existing.rowCount ?? 0) > 0) {
    throw ApiError.conflict("An account with this email already exists");
  }

  if (input.councilId) {
    const council = await query("SELECT id FROM councils WHERE id = $1", [input.councilId]);
    if (council.rowCount === 0) throw ApiError.badRequest("councilId does not match any known council");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const mfaSecret = generateMfaSecret();

  const result = await query<UserRow>(
    `INSERT INTO users (first_name, last_name, email, password_hash, role, home_council_id, mfa_secret)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [input.firstName, input.lastName, input.email, passwordHash, input.role, input.councilId ?? null, mfaSecret]
  );

  return toPublicUser(result.rows[0]);
}

export async function list(): Promise<PublicUser[]> {
  const result = await query<UserRow>(
    `SELECT * FROM users WHERE role != 'citizen' ORDER BY created_at DESC LIMIT 100`
  );
  return result.rows.map(toPublicUser);
}

export async function getById(id: string): Promise<PublicUser> {
  const result = await query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  if (result.rowCount === 0) throw ApiError.notFound("User not found");
  return toPublicUser(result.rows[0]);
}
