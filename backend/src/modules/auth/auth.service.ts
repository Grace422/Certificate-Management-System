import bcrypt from "bcrypt";
import crypto from "crypto";
import { query, withTransaction } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { env } from "../../config/env";
import {
  signAccessToken, signRefreshToken, signMfaChallengeToken,
  verifyRefreshToken, verifyMfaChallengeToken
} from "../../utils/jwt";
import { generateMfaSecret, buildOtpAuthUrl, verifyTotp } from "../../utils/mfa";
import { sha256 } from "../../utils/hash";
import { parseDurationMs } from "../../utils/duration";
import { UserRow, PublicUser, toPublicUser } from "../users/users.types";

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min lockout after too many failed logins

interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ---------- internal helpers ----------

async function findUserByEmail(email: string): Promise<UserRow | null> {
  const res = await query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
  return res.rows[0] ?? null;
}

async function findUserById(id: string): Promise<UserRow | null> {
  const res = await query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  return res.rows[0] ?? null;
}

/**
 * Issues a new access+refresh token pair and persists the refresh token's
 * HASH (never the raw token) so it can be looked up and revoked later.
 */
async function issueTokenPair(user: UserRow): Promise<TokenPair> {
  const jti = crypto.randomUUID();
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN));
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, sha256(refreshToken), expiresAt]
  );

  return { accessToken, refreshToken };
}

async function recordFailedLogin(user: UserRow): Promise<void> {
  const newCount = user.failed_login_count + 1;
  const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;
  await query(
    `UPDATE users
     SET failed_login_count = $1,
         locked_until = $2
     WHERE id = $3`,
    [
      shouldLock ? 0 : newCount, // reset counter once locked, lockout itself is the deterrent
      shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
      user.id
    ]
  );
}

async function clearFailedLogins(userId: string): Promise<void> {
  await query(`UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = $1`, [userId]);
}

function assertNotLocked(user: UserRow): void {
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    throw ApiError.forbidden("Account temporarily locked due to too many failed login attempts. Try again later.");
  }
}

// ---------- public service functions ----------

/**
 * Step 1 of registration: create the account and generate a TOTP secret.
 * Returns a short-lived challenge token + otpauth URL for the frontend to
 * render as a QR code. The account cannot log in until MFA setup completes.
 */
export async function register(input: RegisterInput): Promise<{ challengeToken: string; otpauthUrl: string }> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const mfaSecret = generateMfaSecret();

  const result = await query<UserRow>(
    `INSERT INTO users (first_name, last_name, email, password_hash, phone, date_of_birth, place_of_birth, mfa_secret, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'citizen')
     RETURNING *`,
    [input.firstName, input.lastName, input.email, passwordHash, input.phone ?? null, input.dateOfBirth ?? null, input.placeOfBirth ?? null, mfaSecret]
  );
  const user = result.rows[0];

  const challengeToken = signMfaChallengeToken({ sub: user.id, purpose: "mfa_setup" });
  const otpauthUrl = buildOtpAuthUrl(user.email, mfaSecret);

  return { challengeToken, otpauthUrl };
}

/**
 * Step 2 of registration: user submits the 6-digit code from their
 * authenticator app to prove they scanned it correctly. On success, MFA is
 * permanently enabled and the account becomes fully usable (tokens issued).
 */
export async function completeMfaSetup(challengeToken: string, otp: string): Promise<{ user: PublicUser; tokens: TokenPair }> {
  const payload = verifyMfaChallengeToken(challengeToken); // throws if expired/invalid
  if (payload.purpose !== "mfa_setup") {
    throw ApiError.badRequest("Invalid challenge token for this action");
  }

  const user = await findUserById(payload.sub);
  if (!user) throw ApiError.notFound("User not found");
  if (user.mfa_enabled) throw ApiError.conflict("MFA is already enabled for this account");
  if (!user.mfa_secret) throw ApiError.internal("No MFA secret on file for this account");

  if (!verifyTotp(otp, user.mfa_secret)) {
    throw ApiError.badRequest("Invalid or expired code");
  }

  await query("UPDATE users SET mfa_enabled = true WHERE id = $1", [user.id]);
  const tokens = await issueTokenPair(user);

  return { user: toPublicUser({ ...user, mfa_enabled: true }), tokens };
}

interface LoginResult {
  requiresSetup: boolean;      // true = account has no MFA yet, frontend should route to MFA setup (not verify)
  challengeToken: string;
  otpauthUrl?: string;         // only present when requiresSetup is true
}

/**
 * Step 1 of login: verify email + password. Never reveals whether the
 * email exists or the password was wrong (identical error message) to
 * prevent user enumeration. On success:
 *   - if MFA is already enabled -> issues a login challenge (step 2: verifyMfaLogin)
 *   - if MFA is NOT yet enabled (e.g. an admin account just created by
 *     Super Admin, who never went through /register) -> issues a SETUP
 *     challenge + otpauth URL instead, reusing the same completeMfaSetup()
 *     flow citizens use. This means there is only one MFA-enrollment code
 *     path in the whole system, used by both self-registration and
 *     admin-provisioned accounts.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const genericError = () => ApiError.unauthorized("Invalid email or password");

  const user = await findUserByEmail(email);
  if (!user || !user.is_active) throw genericError();

  assertNotLocked(user);

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    await recordFailedLogin(user);
    throw genericError();
  }

  await clearFailedLogins(user.id);

  if (!user.mfa_enabled) {
    if (!user.mfa_secret) throw ApiError.internal("No MFA secret on file for this account");
    const challengeToken = signMfaChallengeToken({ sub: user.id, purpose: "mfa_setup" });
    const otpauthUrl = buildOtpAuthUrl(user.email, user.mfa_secret);
    return { requiresSetup: true, challengeToken, otpauthUrl };
  }

  const challengeToken = signMfaChallengeToken({ sub: user.id, purpose: "mfa_login" });
  return { requiresSetup: false, challengeToken };
}

/** Step 2 of login: verify the TOTP code and issue real access/refresh tokens. */
export async function verifyMfaLogin(challengeToken: string, otp: string): Promise<{ user: PublicUser; tokens: TokenPair }> {
  const payload = verifyMfaChallengeToken(challengeToken);
  if (payload.purpose !== "mfa_login") {
    throw ApiError.badRequest("Invalid challenge token for this action");
  }

  const user = await findUserById(payload.sub);
  if (!user || !user.is_active) throw ApiError.unauthorized();
  if (!user.mfa_secret) throw ApiError.internal("No MFA secret on file for this account");

  if (!verifyTotp(otp, user.mfa_secret)) {
    throw ApiError.badRequest("Invalid or expired code");
  }

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), tokens };
}

/**
 * Rotates a refresh token: the presented token is verified, matched against
 * its stored hash, and MUST be un-revoked and unexpired. It is then revoked
 * and a brand new pair is issued. If an already-revoked token is presented
 * again, this is treated as a signal of possible theft/replay and ALL of
 * that user's sessions are revoked as a precaution.
 */
export async function refreshTokens(rawRefreshToken: string): Promise<TokenPair> {
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const tokenHash = sha256(rawRefreshToken);
  const res = await query<{ id: string; user_id: string; revoked_at: string | null; expires_at: string }>(
    "SELECT id, user_id, revoked_at, expires_at FROM refresh_tokens WHERE token_hash = $1",
    [tokenHash]
  );
  const stored = res.rows[0];

  if (!stored) throw ApiError.unauthorized("Refresh token not recognized");

  if (stored.revoked_at) {
    // Reuse of a revoked token = likely theft. Nuke every session for this user.
    await query("UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [stored.user_id]);
    throw ApiError.unauthorized("Refresh token reuse detected - all sessions revoked. Please log in again.");
  }

  if (new Date(stored.expires_at).getTime() < Date.now()) {
    throw ApiError.unauthorized("Refresh token expired");
  }

  const user = await findUserById(payload.sub);
  if (!user || !user.is_active) throw ApiError.unauthorized();

  return withTransaction(async (client) => {
    const jti = crypto.randomUUID();
    const newAccessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const newRefreshToken = signRefreshToken({ sub: user.id, jti });
    const newHash = sha256(newRefreshToken);
    const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN));

    await client.query("UPDATE refresh_tokens SET revoked_at = now(), replaced_by_hash = $1 WHERE id = $2", [newHash, stored.id]);
    await client.query("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [user.id, newHash, expiresAt]);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  });
}

/** Revokes a single refresh token (logout of the current device only). */
export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = sha256(rawRefreshToken);
  await query("UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL", [tokenHash]);
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await findUserById(userId);
  if (!user) throw ApiError.notFound("User not found");
  return toPublicUser(user);
}
