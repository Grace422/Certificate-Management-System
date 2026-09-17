import { z } from "zod";

export const createLossDeclarationSchema = z.object({
  body: z.object({
    description: z.string().min(10).max(1000),
    civilRecordId: z.string().uuid().optional() // may be unknown if the citizen can't find their record yet
  })
});
