import crypto from "crypto";

// Refresh tokens are long random-entropy JWTs, NOT low-entropy secrets like
// passwords - a fast hash (SHA-256) is appropriate here (no need for
// bcrypt's deliberate slowness, which is only needed to slow down brute
// force against guessable inputs).
export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
