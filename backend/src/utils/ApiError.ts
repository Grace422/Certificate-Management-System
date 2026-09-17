/**
 * Custom application error. Throw this anywhere in controllers/services
 * instead of a plain Error, so the global error middleware can format
 * a consistent JSON response with the right HTTP status code.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean; // true = expected/handled error, false = bug
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }
  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }
  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }
  static conflict(message: string) {
    return new ApiError(409, message);
  }
  static internal(message = "Internal server error") {
    return new ApiError(500, message, undefined, false);
  }
}
