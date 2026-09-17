import { Response } from "express";

// Every successful response follows the same envelope shape so the
// frontend can rely on a single response contract across all endpoints.
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}
