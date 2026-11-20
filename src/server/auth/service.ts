import "server-only";

import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { AccountStatus, UserRole } from "@/generated/prisma/client";
import { consumeRateLimit } from "./rate-limit";
import { createOpaqueToken, constantTimeSecretEquals, hashOpaqueToken, PASSWORD_RESET_TTL_SECONDS, SESSION_TTL_SECONDS } from "./crypto";
import { hashPassword, verifyPassword } from "./password";
import { setAuthRlsContext, withAuthRlsContext } from "./rls";
import { phoneNumberSchema, resetPasswordInputSchema, signInInputSchema, signUpInputSchema, type SignInInput, type SignUpInput } from "./validation";

const sessionCookie = "kb_session";
export function demoAuthCodesEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview";
}

export type AuthUser = { id: string; phoneNumber: string; fullName: string; role: UserRole };
export type SignInResult = { ok: true; user: AuthUser } | { ok: false; reason: "invalid" | "pending" | "limited" };
export type SignUpResult = { ok: true; pendingVerification: boolean } | { ok: false; reason: "invalid" | "duplicate" | "limited" };

function userDto(user: { id: string; phoneNumber: string; fullName: string; role: UserRole }): AuthUser {
  return { id: user.id, phoneNumber: user.phoneNumber, fullName: user.fullName, role: user.role };
}

async function establishSession(userId: string): Promise<void> {
  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await withAuthRlsContext({ userId }, (tx) => tx.authSession.create({
    data: { id: randomUUID(), userId, tokenHash, expiresAt },
    select: { id: true },
  }));
  await setSessionCookie(token);
}

async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function registerAccount(input: SignUpInput): Promise<SignUpResult> {
  const parsed = signUpInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const data = parsed.data;
  const limited = await consumeRateLimit("signup", data.phoneNumber, 5, 60 * 60);
  if (!limited.allowed) return { ok: false, reason: "limited" };

  if (data.role === "ADMIN") {
    if (!demoAuthCodesEnabled() ||
        !constantTimeSecretEquals(data.adminAccessCode, process.env.DEMO_ADMIN_ACCESS_CODE)) {
      return { ok: false, reason: "invalid" };
    }
  }
  if (data.role === "OFFICER") {
    if (!demoAuthCodesEnabled() ||
        !constantTimeSecretEquals(data.officerBypassCode, process.env.DEMO_OFFICER_BYPASS_CODE)) {
      return { ok: false, reason: "invalid" };
    }
  }

  const passwordHash = await hashPassword(data.password);
  const fullName = `${data.firstName} ${data.lastName}`;
  const role = data.role as UserRole;
  const status = role === "OFFICER" ? AccountStatus.PENDING_VERIFICATION : AccountStatus.ACTIVE;
  const userId = randomUUID();
  const existing = await withAuthRlsContext({ authPhone: data.phoneNumber }, (tx) =>
    tx.user.findUnique({ where: { phoneNumber: data.phoneNumber }, select: { id: true } }),
  );
  if (existing) return { ok: false, reason: "duplicate" };

  try {
    const sessionToken = status === AccountStatus.ACTIVE ? createOpaqueToken() : null;
    await withAuthRlsContext({ authAction: "signup", authPhone: data.phoneNumber, userId }, async (tx) => {
      await tx.user.create({
        data: { id: userId, phoneNumber: data.phoneNumber, fullName, role, status, passwordHash },
        select: { id: true },
      });
      if (sessionToken) {
        await tx.authSession.create({
          data: {
            id: randomUUID(), userId, tokenHash: hashOpaqueToken(sessionToken),
            expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
          },
          select: { id: true },
        });
      }
    });
    if (sessionToken) await setSessionCookie(sessionToken);
  } catch (error) {
    // Concurrent duplicate registrations can race the preflight lookup.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { ok: false, reason: "duplicate" };
    }
    throw error;
  }
  return { ok: true, pendingVerification: status === AccountStatus.PENDING_VERIFICATION };
}

export async function signIn(input: SignInInput): Promise<SignInResult> {
  const parsed = signInInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const data = parsed.data;
  const limited = await consumeRateLimit("signin", data.phoneNumber, 10, 15 * 60);
  if (!limited.allowed) return { ok: false, reason: "limited" };
  const user = await withAuthRlsContext({ authPhone: data.phoneNumber }, (tx) =>
    tx.user.findUnique({ where: { phoneNumber: data.phoneNumber } }),
  );
  const validPassword = await verifyPassword(data.password, user?.passwordHash ?? null);
  const requiredAdminCode = demoAuthCodesEnabled()
    ? process.env.DEMO_ADMIN_ACCESS_CODE
    : process.env.ADMIN_ACCESS_CODE;
  const adminCodeValid = user?.role !== UserRole.ADMIN ||
    constantTimeSecretEquals(data.adminAccessCode, requiredAdminCode);
  if (!user || !validPassword || !adminCodeValid || user.disabledAt || user.status === AccountStatus.SUSPENDED || (data.role && user.role !== data.role)) {
    return { ok: false, reason: "invalid" };
  }
  if (user.status === AccountStatus.PENDING_VERIFICATION || (user.role === UserRole.OFFICER && !user.officerVerifiedAt)) {
    return { ok: false, reason: "pending" };
  }

  await establishSession(user.id);
  return { ok: true, user: userDto(user) };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (!token) return null;
  const tokenHash = hashOpaqueToken(token);
  const session = await withAuthRlsContext({ sessionTokenHash: tokenHash }, (tx) =>
    tx.authSession.findFirst({ where: { tokenHash, expiresAt: { gt: new Date() } } }),
  );
  if (!session) return null;
  const user = await withAuthRlsContext({ userId: session.userId }, (tx) =>
    tx.user.findUnique({ where: { id: session.userId } }),
  );
  if (!user || user.disabledAt || user.status !== AccountStatus.ACTIVE ||
      (user.role === UserRole.OFFICER && !user.officerVerifiedAt)) return null;
  return userDto(user);
}

export async function requireRole(...roles: UserRole[]): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) throw new Error("Unauthorized.");
  return user;
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (token) {
    const tokenHash = hashOpaqueToken(token);
    await withAuthRlsContext({ sessionTokenHash: tokenHash }, (tx) => tx.authSession.deleteMany({ where: { tokenHash } }));
  }
  cookieStore.delete(sessionCookie);
}

/** Create a short-lived token for a trusted reset-delivery channel. Never return it from a public route. */
export async function createPasswordResetToken(phoneNumberInput: string): Promise<string | null> {
  const parsedPhone = phoneNumberSchema.safeParse(phoneNumberInput);
  if (!parsedPhone.success) return null;
  const limited = await consumeRateLimit("password-reset", parsedPhone.data, 3, 60 * 60);
  if (!limited.allowed) return null;
  const user = await withAuthRlsContext({ authPhone: parsedPhone.data }, (tx) =>
    tx.user.findUnique({ where: { phoneNumber: parsedPhone.data }, select: { id: true, status: true } }),
  );
  if (!user || user.status !== AccountStatus.ACTIVE) return null;

  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  await withAuthRlsContext({ userId: user.id }, (tx) => tx.passwordResetToken.create({
    data: {
      id: randomUUID(), userId: user.id, tokenHash,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000),
    },
    select: { id: true },
  }));
  return token;
}

export async function resetPassword(input: { token: string; newPassword: string }): Promise<boolean> {
  const parsed = resetPasswordInputSchema.safeParse(input);
  if (!parsed.success) return false;
  const passwordHash = await hashPassword(parsed.data.newPassword);
  const tokenHash = hashOpaqueToken(parsed.data.token);
  return withAuthRlsContext({ passwordResetTokenHash: tokenHash }, async (tx) => {
    const reset = await tx.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true },
    });
    if (!reset) return false;

    const now = new Date();
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: reset.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return false;
    await setAuthRlsContext(tx, { userId: reset.userId });
    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash, updatedAt: now }, select: { id: true } });
    await tx.authSession.deleteMany({ where: { userId: reset.userId } });
    return true;
  });
}
