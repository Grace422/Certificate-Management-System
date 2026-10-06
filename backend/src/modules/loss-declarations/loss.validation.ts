import { z } from "zod";

export const createLossDeclarationSchema = z.object({
  body: z.object({
    description: z.string().min(10).max(1000),
    civilRecordId: z.string().uuid().optional()
  })
});

export const reviewLossDeclarationSchema = z.object({
  body: z.object({
    notes: z.string().max(1000).optional()
  })
});

export const rejectLossDeclarationSchema = z.object({
  body: z.object({
    notes: z.string().min(3).max(1000)
  })
});
