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

export interface UserListFilters {
  role?: string;
  search?: string;
}

/**
 * Lists users for the admin "Manage users" view. Includes citizens too
 * (Super Admin needs to see everyone in the system, not just staff) -
 * protected by requireRole("super_admin") at the route level.
 */
export async function list(filters: UserListFilters = {}): Promise<PublicUser[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.role) {
    values.push(filters.role);
    conditions.push(`u.role = $${values.length}`);
  }
  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`(u.first_name || ' ' || u.last_name ILIKE $${values.length} OR u.email ILIKE $${values.length})`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query<UserRow>(
    `SELECT u.*, c.name AS council_name
     FROM users u
     LEFT JOIN councils c ON c.id = u.home_council_id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT 200`,
    values
  );
  return result.rows.map(toPublicUser);
}

export async function getById(id: string): Promise<PublicUser> {
  const result = await query<UserRow>(
    `SELECT u.*, c.name AS council_name
     FROM users u
     LEFT JOIN councils c ON c.id = u.home_council_id
     WHERE u.id = $1`,
    [id]
  );
  if (result.rowCount === 0) throw ApiError.notFound("User not found");
  return toPublicUser(result.rows[0]);
}
