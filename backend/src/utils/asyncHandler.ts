import { NextFunction, Request, Response } from "express";

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Wraps an async controller so any rejected promise/thrown error
// is forwarded to next() -> caught by the global error handler,
// instead of crashing the process or requiring try/catch everywhere.
export const asyncHandler = (fn: AsyncFn) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
