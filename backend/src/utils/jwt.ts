import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "../middlewares/auth.middleware";

export interface AccessTokenPayload {
  sub: string;   // user id
  email: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;   // unique token id - lets us find/revoke the matching DB row
}

// MFA challenge tokens are short-lived, single-purpose tokens issued between
// step 1 (password OK) and step 2 (OTP OK) of login, and during initial
// MFA setup. They are NOT valid for API access - only for completing MFA.
export interface MfaChallengePayload {
  sub: string;
  purpose: "mfa_setup" | "mfa_login";
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function signMfaChallengeToken(payload: MfaChallengePayload): string {
  // Deliberately short-lived (5 min) - limits the window an intercepted
  // challenge token could be used to attempt OTP brute-forcing.
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: "5m" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export function verifyMfaChallengeToken(token: string): MfaChallengePayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as MfaChallengePayload;
}
