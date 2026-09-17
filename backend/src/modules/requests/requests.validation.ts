import { z } from "zod";

export const createRequestSchema = z.object({
  body: z.object({
    civilRecordId: z.string().uuid(),
    requestType: z.enum(["copy", "reissue"]).default("copy"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  })
});

export const rejectSchema = z.object({
  body: z.object({
    reason: z.string().min(3).max(500)
  })
});
