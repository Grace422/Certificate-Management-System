/**
 * Client-side schemas (zod v4). These MIRROR the server rules — they are a
 * UX convenience, never a security control. The backend must re-validate.
 */
import { z } from 'zod';

/** Cameroon mobile numbers: +2376XXXXXXXX or 6XXXXXXXX. */
const phoneRegex = /^(\+?237)?6[2-9]\d{7}$/;

export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a digit')
  .regex(/[^A-Za-z0-9]/, 'Add a special character');

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});
export type OtpValues = z.infer<typeof otpSchema>;

export const registerSchema = z
  .object({
    firstName: z.string().min(2, 'First name is too short').max(60),
    lastName: z.string().min(2, 'Last name is too short').max(60),
    email: z.email('Enter a valid email address'),
    phone: z.string().regex(phoneRegex, 'Enter a valid Cameroon phone number'),
    nationalId: z.string().max(30).optional().or(z.literal('')),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    placeOfBirth: z.string().min(2, 'Place of birth is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: 'You must accept the terms' }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((v) => new Date(v.dateOfBirth) < new Date(), {
    message: 'Date of birth cannot be in the future',
    path: ['dateOfBirth'],
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const certificateRequestSchema = z.object({
  requestType: z.enum(['COPY', 'LOSS_DECLARATION']),
  certificateType: z.enum(['BIRTH', 'DEATH', 'MARRIAGE']),
  firstName: z.string().min(2, 'Required'),
  lastName: z.string().min(2, 'Required'),
  dateOfBirth: z.string().min(1, 'Required'),
  placeOfBirth: z.string().min(2, 'Required'),
  fatherName: z.string().max(120).optional().or(z.literal('')),
  motherName: z.string().max(120).optional().or(z.literal('')),
  certificateNumber: z.string().max(60).optional().or(z.literal('')),
  copies: z.coerce.number<number>().int().min(1, 'At least 1').max(5, 'Maximum 5 copies'),
  reason: z.string().max(500).optional().or(z.literal('')),
  pickupOfficeId: z.string().min(1, 'Choose a collection point'),
});
export type CertificateRequestValues = z.infer<typeof certificateRequestSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address'),
});

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const officeSchema = z.object({
  name: z.string().min(3, 'Required'),
  region: z.string().min(2, 'Required'),
  division: z.string().min(2, 'Required'),
  council: z.string().min(2, 'Required'),
  address: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.union([z.email(), z.literal('')]).optional(),
  latitude: z.coerce.number<number>().min(1.6).max(13.1, 'Latitude must be inside Cameroon'),
  longitude: z.coerce.number<number>().min(8.4).max(16.2, 'Longitude must be inside Cameroon'),
  isActive: z.boolean(),
});
export type OfficeValues = z.infer<typeof officeSchema>;

/** 0–4 strength score for the password meter. */
export function passwordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 16) score = Math.min(4, score + 1);
  return score;
}
