"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { isSameOriginAction } from "@/server/auth/csrf";
import { getLocationData } from "@/server/location/queries";
import { getCurrentUser } from "@/server/auth/service";
import { updateAccountLocation, updateAccountName } from "@/server/profile";
import { listPendingOfficers, verifyOfficer, type PendingOfficer } from "@/server/officer-verification";
import { logger } from "@/server/logger";

export type ProfileActionState = { ok: boolean; message: string };

const messages = {
  en: {
    origin: "This request could not be verified. Refresh and try again.",
    session: "Your session has ended. Sign in again.",
    nameInvalid: "Enter a first and last name using 3 to 15 characters each.",
    nameSaved: "Name updated.", locationSaved: "Location updated.",
    profileFailed: "Profile could not be updated.",
    locationInvalid: "Choose a valid location before saving.",
    locationIncomplete: "Choose each location level in order. An area is required when one is available.",
    unavailable: "The service is temporarily unavailable. Please try again shortly.",
    officerApproved: "Officer verified. They can now sign in.",
    officerNotFound: "This officer is no longer waiting for verification.",
    adminOnly: "Only Admin accounts can review officer verification.",
  },
  bn: {
    origin: "অনুরোধটি যাচাই করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।",
    session: "আপনার সেশনের মেয়াদ শেষ হয়েছে। আবার সাইন ইন করুন।",
    nameInvalid: "প্রথম ও শেষ নাম ৩ থেকে ১৫ অক্ষরের মধ্যে লিখুন।",
    nameSaved: "নাম আপডেট হয়েছে।", locationSaved: "ঠিকানা আপডেট হয়েছে।",
    profileFailed: "প্রোফাইল আপডেট করা যায়নি।",
    locationInvalid: "সংরক্ষণের আগে একটি সঠিক ঠিকানা বেছে নিন।",
    locationIncomplete: "ধাপে ধাপে ঠিকানা বেছে নিন। এলাকা থাকলে সেটিও নির্বাচন করতে হবে।",
    unavailable: "সেবাটি সাময়িকভাবে বন্ধ আছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
    officerApproved: "কর্মকর্তা যাচাই করা হয়েছে। এখন তিনি সাইন ইন করতে পারবেন।",
    officerNotFound: "এই কর্মকর্তা আর যাচাইয়ের অপেক্ষায় নেই।",
    adminOnly: "শুধুমাত্র অ্যাডমিন অ্যাকাউন্ট কর্মকর্তা যাচাই দেখতে পারবে।",
  },
} as const;

function copyFor(locale: string) {
  return locale === "bn" ? messages.bn : messages.en;
}

const nameSchema = z.object({
  firstName: z.string().trim().min(3).max(15),
  lastName: z.string().trim().min(3).max(15),
});

const locationSchema = z.object({
  divisionId: z.number().int().positive(),
  districtId: z.number().int().positive(),
  upazilaId: z.number().int().positive(),
  areaId: z.number().int().positive().nullable(),
});

async function canMutate(): Promise<boolean> {
  return isSameOriginAction(await headers());
}

export async function loadLocationOptionsAction() {
  return getLocationData();
}

export async function updateProfileNameAction(
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const t = copyFor(String(formData.get("locale") ?? "en"));
  if (!(await canMutate())) return { ok: false, message: t.origin };
  const parsed = nameSchema.safeParse({ firstName: formData.get("firstName"), lastName: formData.get("lastName") });
  if (!parsed.success) return { ok: false, message: t.nameInvalid };

  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, message: t.session };
    const updated = await updateAccountName(user.id, parsed.data.firstName, parsed.data.lastName);
    return updated ? { ok: true, message: t.nameSaved } : { ok: false, message: t.profileFailed };
  } catch (error) {
    logger.error("Profile name update failed.", { errorCode: error instanceof Error ? error.name : "unknown" });
    return { ok: false, message: t.unavailable };
  }
}

export async function loadPendingOfficersAction(): Promise<PendingOfficer[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return [];
  return listPendingOfficers(user.id);
}

const officerIdSchema = z.string().uuid();

export async function approveOfficerAction(
  officerId: unknown,
  locale: string,
): Promise<ProfileActionState> {
  const t = copyFor(locale);
  if (!(await canMutate())) return { ok: false, message: t.origin };
  const parsed = officerIdSchema.safeParse(officerId);
  if (!parsed.success) return { ok: false, message: t.officerNotFound };

  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, message: t.session };
    if (user.role !== "ADMIN") return { ok: false, message: t.adminOnly };
    const approved = await verifyOfficer(user.id, parsed.data);
    return approved
      ? { ok: true, message: t.officerApproved }
      : { ok: false, message: t.officerNotFound };
  } catch (error) {
    logger.error("Officer verification failed.", { errorCode: error instanceof Error ? error.name : "unknown" });
    return { ok: false, message: t.unavailable };
  }
}

export async function updateProfileLocationAction(
  input: unknown,
  locale: string,
): Promise<ProfileActionState> {
  const t = copyFor(locale);
  if (!(await canMutate())) return { ok: false, message: t.origin };
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: t.locationInvalid };

  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, message: t.session };
    const updated = await updateAccountLocation(user.id, parsed.data);
    return updated
      ? { ok: true, message: t.locationSaved }
      : { ok: false, message: t.locationIncomplete };
  } catch (error) {
    logger.error("Profile location update failed.", { errorCode: error instanceof Error ? error.name : "unknown" });
    return { ok: false, message: t.unavailable };
  }
}
