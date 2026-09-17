import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";

export type Role = "citizen" | "origin_admin" | "destination_admin" | "super_admin";

// Extends Express's Request type with the authenticated user payload.
// See src/types/express.d.ts for the module augmentation.

/**
 * Verifies the Bearer access token on the Authorization header and attaches
 * the decoded payload to req.user. Does NOT touch the DB (stateless check)
 * for performance - it trusts the JWT signature + expiry only. If a user is
 * deactivated mid-session, they remain "authenticated" until their access
 * token expires (max JWT_ACCESS_EXPIRES_IN, e.g. 15 min) - an accepted
 * trade-off for not hitting the DB on every request. Sensitive actions can
 * additionally re-check user.is_active at the service layer if needed.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or malformed Authorization header"));
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired access token"));
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}
