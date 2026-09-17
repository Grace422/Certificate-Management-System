import { z } from "zod";

export const nearestQuerySchema = z.object({
  query: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    limit: z.coerce.number().int().min(1).max(20).default(5)
  })
});

export const listQuerySchema = z.object({
  query: z.object({
    region: z.string().optional()
  })
});
