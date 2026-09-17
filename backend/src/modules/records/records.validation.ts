import { z } from "zod";

// At least one identifying field is required - an empty search would scan
// the whole table and could be used to enumerate other people's records.
export const searchQuerySchema = z.object({
  query: z.object({
    fullName: z.string().min(2).optional(),
    dateOfBirth: z.string().date().optional(),
    placeOfBirth: z.string().min(2).optional()
  }).refine(
    (q) => q.fullName || q.dateOfBirth || q.placeOfBirth,
    { message: "Provide at least one of fullName, dateOfBirth, placeOfBirth" }
  )
});
