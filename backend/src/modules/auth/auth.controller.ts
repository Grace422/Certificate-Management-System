import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { env } from "../../config/env";
import * as authService from "./auth.service";

const REFRESH_COOKIE_NAME = "refreshToken";

// Refresh token lives in an httpOnly, Secure, SameSite cookie - JavaScript
// on the frontend can NEVER read it, which is the main defense against
// token theft via XSS. The access token (short-lived) is returned in the
// JSON body instead, for the frontend to hold in memory only.
function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production", // requires HTTPS in prod
    sameSite: "strict",
    path: "/api/v1/auth", // only sent to auth endpoints, minimizing exposure
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { challengeToken, otpauthUrl } = await authService.register(req.body);
  // No tokens yet - account isn't usable until MFA setup (verifyMfaSetup) completes.
  sendSuccess(res, { challengeToken, otpauthUrl }, "Registered. Scan the QR code and verify to activate your account.", 201);
});

export const verifyMfaSetup = asyncHandler(async (req: Request, res: Response) => {
  const { challengeToken, otp } = req.body;
  const { user, tokens } = await authService.completeMfaSetup(challengeToken, otp);
  setRefreshCookie(res, tokens.refreshToken);
  sendSuccess(res, { user, accessToken: tokens.accessToken }, "MFA enabled. Account activated.");
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  sendSuccess(res, result, result.requiresSetup
    ? "MFA setup required before you can log in. Scan the QR code to continue."
    : "Password verified. Enter your authenticator code to continue.");
});

export const verifyMfaLogin = asyncHandler(async (req: Request, res: Response) => {
  const { challengeToken, otp } = req.body;
  const { user, tokens } = await authService.verifyMfaLogin(challengeToken, otp);
  setRefreshCookie(res, tokens.refreshToken);
  sendSuccess(res, { user, accessToken: tokens.accessToken }, "Login successful");
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!raw) throw ApiError.unauthorized("No refresh token provided");

  const tokens = await authService.refreshTokens(raw);
  setRefreshCookie(res, tokens.refreshToken); // rotated - old cookie value is now dead
  sendSuccess(res, { accessToken: tokens.accessToken }, "Token refreshed");
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME];
  if (raw) await authService.logout(raw);
  clearRefreshCookie(res);
  sendSuccess(res, null, "Logged out");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await authService.getMe(req.user.id);
  sendSuccess(res, user, "Current user");
});
