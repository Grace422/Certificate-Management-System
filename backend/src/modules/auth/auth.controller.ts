import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";

// NOTE: Full implementation (bcrypt hashing, JWT issuance, TOTP
// generation/verification) is built out in the dedicated Auth module step.
// These stubs exist so the route file above has real handlers to bind to
// and the project compiles/runs end-to-end right now.

export const register = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, null, "Register endpoint - to be implemented", 501);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, null, "Login endpoint - to be implemented", 501);
});

export const verifyMfa = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, null, "MFA verify endpoint - to be implemented", 501);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, null, "Refresh endpoint - to be implemented", 501);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, null, "Logout endpoint - to be implemented", 501);
});
