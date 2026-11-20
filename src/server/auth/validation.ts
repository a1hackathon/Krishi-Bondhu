import "server-only";

import { z } from "zod";

export function normalizeBangladeshPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("8801") && digits.length === 13) return `0${digits.slice(3)}`;
  return digits;
}

export const phoneNumberSchema = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .transform(normalizeBangladeshPhoneNumber)
  .pipe(z.string().regex(/^01\d{9}$/, "Enter an 11-digit Bangladesh mobile number starting with 01."));

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password must be no more than 72 UTF-8 bytes.");

const nameSchema = z.string().trim().min(3).max(15);

export const signInInputSchema = z.object({
  phoneNumber: phoneNumberSchema,
  password: passwordSchema,
  role: z.enum(["FARMER", "OFFICER", "ADMIN"]).optional(),
  adminAccessCode: z.string().max(128).optional(),
});

export const signUpInputSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phoneNumber: phoneNumberSchema,
  password: passwordSchema,
  role: z.enum(["FARMER", "OFFICER", "ADMIN"]),
  adminAccessCode: z.string().max(128).optional(),
  officerBypassCode: z.string().max(128).optional(),
});

export const resetPasswordInputSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  newPassword: passwordSchema,
});

export type SignInInput = z.infer<typeof signInInputSchema>;
export type SignUpInput = z.infer<typeof signUpInputSchema>;
