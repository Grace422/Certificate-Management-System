import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(100),
    lastName: z.string().min(2).max(100),
    email: z.string().email(),
    // Minimum complexity requirement enforced at the API layer (defense in
    // depth alongside bcrypt storage) - adjust to your policy.
    password: z.string()
      .min(10, "Password must be at least 10 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a digit")
      .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
    phone: z.string().optional(),
    dateOfBirth: z.string().date().optional(),
    placeOfBirth: z.string().max(150).optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  })
});

export const mfaSetupVerifySchema = z.object({
  body: z.object({
    challengeToken: z.string().min(1),
    otp: z.string().length(6)
  })
});

export const mfaLoginVerifySchema = z.object({
  body: z.object({
    challengeToken: z.string().min(1),
    otp: z.string().length(6)
  })
});
