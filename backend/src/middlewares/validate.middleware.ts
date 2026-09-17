import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

/**
 * Generic validation middleware. Pass a zod schema shaped like:
 *   z.object({ body: z.object({...}), params: z.object({...}), query: z.object({...}) })
 * Validates and RE-ASSIGNS req.body/params/query with the parsed
 * (type-coerced, defaulted) values.
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      req.body = parsed.body ?? req.body;
      req.query = parsed.query ?? req.query;
      req.params = parsed.params ?? req.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(ApiError.badRequest("Validation failed", err.flatten().fieldErrors));
      }
      next(err);
    }
  };
}
