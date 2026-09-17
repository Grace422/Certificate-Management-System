/**
 * SINGLE SOURCE OF TRUTH for backend routes.
 *
 * ▸ If your Express routes differ, edit ONLY this file — no component,
 *   hook or service imports a hard-coded URL anywhere else.
 * ▸ Paths are relative to NEXT_PUBLIC_API_URL (e.g. http://localhost:5000/api/v1).
 */

export const ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    /** Step 2 of login: exchange {mfaToken, code} for an access token. */
    verifyMfa: '/auth/mfa/verify',
    /** Ask the backend to re-send an email/SMS OTP. */
    resendOtp: '/auth/mfa/resend',
    /** Enrol an authenticator app: returns secret + otpauth URL. */
    mfaSetup: '/auth/mfa/setup',
    /** Confirm enrolment with a first valid TOTP code. */
    mfaEnable: '/auth/mfa/enable',
    mfaDisable: '/auth/mfa/disable',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    changePassword: '/auth/change-password',
    verifyEmail: '/auth/verify-email',
    /** Optional: double-submit CSRF token for cookie mode. */
    csrf: '/auth/csrf-token',
  },

  users: {
    profile: '/users/me',
    updateProfile: '/users/me',
    updateLocation: '/users/me/location',
  },

  requests: {
    list: '/requests',                                  // citizen: own requests
    create: '/requests',
    byId: (id: string) => `/requests/${id}`,
    cancel: (id: string) => `/requests/${id}/cancel`,
    timeline: (id: string) => `/requests/${id}/timeline`,
    attachments: (id: string) => `/requests/${id}/attachments`,
    download: (id: string) => `/requests/${id}/document`,
    /** Public-ish lookup by reference code for tracking. */
    track: (reference: string) => `/requests/track/${reference}`,
  },

  offices: {
    list: '/offices',
    byId: (id: string) => `/offices/${id}`,
    /** GET /offices/nearest?lat=..&lng=..&limit=5 */
    nearest: '/offices/nearest',
    create: '/offices',
    update: (id: string) => `/offices/${id}`,
    remove: (id: string) => `/offices/${id}`,
    importCsv: '/offices/import',
  },

  admin: {
    stats: '/admin/stats',
    requests: '/admin/requests',
    requestById: (id: string) => `/admin/requests/${id}`,
    updateStatus: (id: string) => `/admin/requests/${id}/status`,
    /** Assign the pickup municipal building. */
    assignOffice: (id: string) => `/admin/requests/${id}/dispatch`,
    /** Run the archive-matching algorithm for a request. */
    searchRecords: (id: string) => `/admin/requests/${id}/match`,
    attachDocument: (id: string) => `/admin/requests/${id}/document`,
    users: '/admin/users',
    records: '/admin/records',
    /** Bulk upload of the civil-status archive (CSV/XLSX multipart). */
    importRecords: '/admin/records/import',
    auditLogs: '/admin/audit-logs',
  },
} as const;
