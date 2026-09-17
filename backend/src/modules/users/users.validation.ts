import { z } from "zod";

// Super Admin provisions staff accounts. citizen accounts are created only
// via public self-registration (/auth/register), never through this route.
export const createAdminSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(100),
    lastName: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(10),
    role: z.enum(["origin_admin", "destination_admin", "super_admin"]),
    // The council this admin manages (approves/routes requests for, or
    // receives forwarded certificates at). Not required for super_admin,
    // who operates system-wide rather than for one council.
    councilId: z.string().uuid().optional()
  }).refine(
    (data) => data.role === "super_admin" || !!data.councilId,
    { message: "councilId is required for origin_admin and destination_admin", path: ["councilId"] }
  )
});
