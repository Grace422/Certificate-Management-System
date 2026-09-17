import { authenticator } from "otplib";
import { env } from "../config/env";

// otplib defaults (30s step, 6 digits, SHA1) match Google Authenticator /
// Authy / most authenticator apps - do not change these without checking
// app compatibility.

export function generateMfaSecret(): string {
  return authenticator.generateSecret(); // base32-encoded secret
}

// otpauth:// URI that the frontend renders as a QR code (via qrcode.react)
// for the user to scan with their authenticator app.
export function buildOtpAuthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, env.MFA_ISSUER, secret);
}

export function verifyTotp(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false; // malformed token -> treat as invalid, not a crash
  }
}
