"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSameOriginAction } from "@/server/auth/csrf";
import { registerAccount, signIn, signOut } from "@/server/auth/service";
import type { SignInInput, SignUpInput } from "@/server/auth/validation";
import { logger } from "@/server/logger";

export type AuthActionState = {
  kind: "idle" | "error" | "success" | "pending";
  message: string;
  authenticated?: boolean;
};

const copy = {
  en: {
    origin: "This request could not be verified. Refresh and try again.", invalid: "Unable to sign in with those details.",
    pending: "Account not verified yet. It may take a little while.", limited: "Too many attempts. Please try again later.",
    duplicate: "An account already uses this phone number. Sign in instead.", signup: "Check your details and access code, then try again.",
    signedIn: "You are signed in. Your workspace is coming in the next milestone.", created: "Your account is ready. You are signed in.",
    submitted: "Sent for verification. You will receive a message soon.", mismatch: "Passwords do not match.", unavailable: "The service is temporarily unavailable. Please try again shortly.",
  },
  bn: {
    origin: "অনুরোধটি যাচাই করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।", invalid: "এই তথ্য দিয়ে সাইন ইন করা যায়নি।",
    pending: "অ্যাকাউন্টটি এখনো যাচাই হয়নি। কিছু সময় অপেক্ষা করুন।", limited: "অনেকবার চেষ্টা করা হয়েছে। পরে আবার চেষ্টা করুন।",
    duplicate: "এই নম্বর দিয়ে একটি অ্যাকাউন্ট আছে। সাইন ইন করুন।", signup: "তথ্য ও অ্যাক্সেস কোড যাচাই করে আবার চেষ্টা করুন।",
    signedIn: "আপনি সাইন ইন করেছেন। পরবর্তী ধাপে আপনার কর্মক্ষেত্র তৈরি হবে।", created: "অ্যাকাউন্ট তৈরি হয়েছে এবং আপনি সাইন ইন করেছেন।",
    submitted: "যাচাইয়ের জন্য পাঠানো হয়েছে। শিগগিরই বার্তা পাবেন।", mismatch: "পাসওয়ার্ড দুটি মিলছে না।", unavailable: "সেবাটি সাময়িকভাবে বন্ধ আছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
  },
} as const;

function language(formData: FormData) {
  return String(formData.get("locale") ?? "en") === "bn" ? copy.bn : copy.en;
}

async function originIsAllowed(): Promise<boolean> {
  return isSameOriginAction(await headers());
}

function authErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") return error.code;
  return error instanceof Error ? error.name : "unknown";
}

export async function signInAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const t = language(formData);
  if (!(await originIsAllowed())) return { kind: "error", message: t.origin };
  const input: SignInInput = {
    phoneNumber: String(formData.get("phoneNumber") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "FARMER") as SignInInput["role"],
    adminAccessCode: String(formData.get("adminAccessCode") ?? ""),
  };
  let result: Awaited<ReturnType<typeof signIn>>;
  try {
    result = await signIn(input);
  } catch (error) {
    logger.error("Sign-in failed because the auth service was unavailable.", { errorCode: authErrorCode(error) });
    return { kind: "error", message: t.unavailable };
  }
  if (result.ok) {
    const locale = String(formData.get("locale") ?? "en");
    redirect(locale === "bn" ? "/bn" : "/en");
  }
  if (result.reason === "pending") return { kind: "pending", message: t.pending };
  if (result.reason === "limited") return { kind: "error", message: t.limited };
  return { kind: "error", message: t.invalid };
}

export async function signUpAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const t = language(formData);
  if (!(await originIsAllowed())) return { kind: "error", message: t.origin };
  const password = String(formData.get("password") ?? "");
  if (password !== String(formData.get("confirmPassword") ?? "")) return { kind: "error", message: t.mismatch };
  const input: SignUpInput = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phoneNumber: String(formData.get("phoneNumber") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "FARMER") as SignUpInput["role"],
    adminAccessCode: String(formData.get("adminAccessCode") ?? ""),
    officerBypassCode: String(formData.get("officerBypassCode") ?? ""),
  };
  let result: Awaited<ReturnType<typeof registerAccount>>;
  try {
    result = await registerAccount(input);
  } catch (error) {
    logger.error("Signup failed because the auth service was unavailable.", { errorCode: authErrorCode(error) });
    return { kind: "error", message: t.unavailable };
  }
  if (!result.ok) {
    if (result.reason === "duplicate") return { kind: "error", message: t.duplicate };
    if (result.reason === "limited") return { kind: "error", message: t.limited };
    return { kind: "error", message: t.signup };
  }
  if (result.pendingVerification) return { kind: "pending", message: t.submitted };
  const locale = String(formData.get("locale") ?? "en");
  redirect(locale === "bn" ? "/bn" : "/en");
}

export async function signOutAction(formData: FormData): Promise<void> {
  if (!(await originIsAllowed())) return;
  await signOut();
  const locale = String(formData.get("locale") ?? "en");
  redirect(locale === "bn" ? "/bn" : "/en");
}
