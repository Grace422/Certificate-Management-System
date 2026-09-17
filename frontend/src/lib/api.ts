import { ApiEnvelope } from "@/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface FetchOptions extends RequestInit {
  accessToken?: string;
}

/**
 * Thin fetch wrapper: always sends credentials (so the httpOnly refresh
 * cookie travels with auth requests), attaches a Bearer token when given,
 * and normalizes the backend's { success, message, data } envelope into
 * either a resolved value or a thrown ApiError.
 */
export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { accessToken, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include", // required for the refresh-token cookie
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers
    }
  });

  const body: ApiEnvelope<T> = await res.json();

  if (!res.ok || !body.success) {
    throw new ApiError(res.status, body.message ?? "Request failed", body.details);
  }

  return body.data;
}
