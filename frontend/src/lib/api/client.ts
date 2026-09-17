/**
 * Axios instance shared by every service.
 *
 * Responsibilities:
 *  - attach credentials (cookie mode) or Authorization header (bearer mode)
 *  - attach CSRF double-submit header for state-changing requests
 *  - transparently refresh an expired access token ONCE and replay the
 *    queued requests (prevents a refresh stampede)
 *  - normalise every backend error into a typed ApiError
 */

import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { config } from '@/lib/config';
import { ENDPOINTS } from './endpoints';

/* ------------------------------------------------------------------ */
/* Error type                                                          */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  status: number;
  /** Field-level validation errors: { email: "already in use" } */
  fieldErrors?: Record<string, string>;
  code?: string;

  constructor(
    message: string,
    status = 0,
    fieldErrors?: Record<string, string>,
    code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

/* ------------------------------------------------------------------ */
/* In-memory access token (bearer mode only — never persisted)         */
/* ------------------------------------------------------------------ */

let accessToken: string | null = null;
let csrfToken: string | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (t: string | null) => {
    accessToken = t;
  },
  clear: () => {
    accessToken = null;
  },
};

/** Called by AuthContext when the session is destroyed. */
let onUnauthenticated: (() => void) | null = null;
export function setUnauthenticatedHandler(fn: (() => void) | null) {
  onUnauthenticated = fn;
}

/* ------------------------------------------------------------------ */
/* Instance                                                            */
/* ------------------------------------------------------------------ */

export const api: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: config.requestTimeoutMs,
  // Cookie mode needs credentials on every call (backend must set
  // Access-Control-Allow-Credentials: true and an explicit origin).
  withCredentials: config.authMode === 'cookie',
  headers: { 'Content-Type': 'application/json' },
});

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

api.interceptors.request.use((req: InternalAxiosRequestConfig) => {
  const headers = AxiosHeaders.from(req.headers);

  if (config.authMode === 'bearer' && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (csrfToken && UNSAFE_METHODS.has((req.method ?? 'get').toLowerCase())) {
    headers.set('X-CSRF-Token', csrfToken);
  }
  // Let the browser set the multipart boundary itself.
  if (typeof FormData !== 'undefined' && req.data instanceof FormData) {
    headers.delete('Content-Type');
  }

  req.headers = headers;
  return req;
});

/* --- refresh-once-and-replay ------------------------------------- */

type Waiter = (token: string | null) => void;
let isRefreshing = false;
let waiters: Waiter[] = [];

function flushWaiters(token: string | null) {
  waiters.forEach((w) => w(token));
  waiters = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ message?: string; errors?: unknown; code?: string }>) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;

    // Network / timeout — no response at all.
    if (!error.response) {
      return Promise.reject(
        new ApiError(
          error.code === 'ECONNABORTED'
            ? 'The server took too long to respond. Please try again.'
            : 'Cannot reach the server. Check your connection.',
          0,
        ),
      );
    }

    const { status, data } = error.response;
    const url = original?.url ?? '';
    const isAuthRoute =
      url.includes(ENDPOINTS.auth.login) ||
      url.includes(ENDPOINTS.auth.refresh) ||
      url.includes(ENDPOINTS.auth.verifyMfa);

    if (status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true;

      if (isRefreshing) {
        // Queue until the in-flight refresh settles.
        return new Promise((resolve, reject) => {
          waiters.push((token) => {
            if (config.authMode === 'bearer' && !token) {
              reject(new ApiError('Session expired. Please sign in again.', 401));
              return;
            }
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const { data: refreshed } = await axios.post<{ data?: { accessToken?: string } }>(
          `${config.apiUrl}${ENDPOINTS.auth.refresh}`,
          {},
          { withCredentials: true },
        );
        const newToken = refreshed?.data?.accessToken ?? null;
        if (config.authMode === 'bearer') tokenStore.set(newToken);
        flushWaiters(newToken);
        return api(original);
      } catch {
        tokenStore.clear();
        flushWaiters(null);
        onUnauthenticated?.();
        return Promise.reject(new ApiError('Session expired. Please sign in again.', 401));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(toApiError(status, data));
  },
);

/** Turn assorted backend error shapes into one predictable object. */
function toApiError(
  status: number,
  data: { message?: string; error?: string; errors?: unknown; code?: string } | undefined,
): ApiError {
  const fieldErrors: Record<string, string> = {};
  const raw = data?.errors;

  if (Array.isArray(raw)) {
    // express-validator: [{ path|param, msg }]
    for (const e of raw as Array<Record<string, string>>) {
      const key = e.path ?? e.param ?? e.field;
      if (key) fieldErrors[key] = e.msg ?? e.message ?? 'Invalid value';
    }
  } else if (raw && typeof raw === 'object') {
    // { email: "already in use" } or { email: ["..."] }
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      fieldErrors[k] = Array.isArray(v) ? String(v[0]) : String(v);
    }
  }

  const fallback =
    status === 403
      ? 'You do not have permission to perform this action.'
      : status === 404
        ? 'Not found.'
        : status === 429
          ? 'Too many attempts. Please wait a moment and try again.'
          : status >= 500
            ? 'Something went wrong on the server. Please try again later.'
            : 'Request failed.';

  return new ApiError(
    data?.message ?? data?.error ?? fallback,
    status,
    Object.keys(fieldErrors).length ? fieldErrors : undefined,
    data?.code,
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Unwraps `{ success, data }` envelopes but also tolerates a backend that
 * returns the payload directly — so you don't have to change your API.
 */
export function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

/** Fetch and cache the CSRF token (cookie mode, double-submit pattern). */
export async function primeCsrfToken(): Promise<void> {
  if (config.authMode !== 'cookie' || csrfToken) return;
  try {
    const { data } = await api.get(ENDPOINTS.auth.csrf);
    csrfToken = unwrap<{ csrfToken: string }>(data)?.csrfToken ?? null;
  } catch {
    // Endpoint optional: ignore if the backend doesn't implement it yet.
  }
}
