import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

export type Role = "citizen" | "origin_admin" | "destination_admin" | "super_admin";

// Extends Express's Request type with the authenticated user payload.
// See src/types/express.d.ts for the module augmentation.

/**
 * PLACEHOLDER - full implementation (JWT verification, token extraction
 * from Authorization header, MFA-verified claim check) lands in the
 * Auth module step. Left here so route files can already import it
 * and the folder structure is complete.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  // TODO: verify Bearer JWT, attach req.user = { id, role, ... }
  return next(ApiError.internal("requireAuth not yet implemented"));
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
