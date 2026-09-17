/** Runtime configuration read from NEXT_PUBLIC_* env vars. */

export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1',

  /**
   * 'cookie'  – backend sets httpOnly Secure SameSite cookies (RECOMMENDED,
   *             immune to XSS token theft). Axios sends withCredentials.
   * 'bearer'  – backend returns a JWT in the JSON body. We keep it in memory
   *             only (never localStorage) and refresh it on 401.
   */
  authMode: (process.env.NEXT_PUBLIC_AUTH_MODE ?? 'cookie') as 'cookie' | 'bearer',

  /** Name of the cookie your backend sets; used only by middleware for a
   *  cheap "is there a session?" check (never trusted for authorisation). */
  sessionCookieName: process.env.NEXT_PUBLIC_SESSION_COOKIE ?? 'access_token',

  appName: 'CivilReg Cameroon',
  requestTimeoutMs: 20000,

  /** Geographic centre of Cameroon — default map view. */
  defaultMapCenter: { latitude: 5.6919, longitude: 12.7402 },
  defaultMapZoom: 6,
} as const;
