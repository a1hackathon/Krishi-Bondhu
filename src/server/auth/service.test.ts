import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStatus, UserRole } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  withAuthRlsContext: vi.fn(),
  setAuthRlsContext: vi.fn(),
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
  cookies: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  sessionCreate: vi.fn(),
  sessionFindFirst: vi.fn(),
  sessionDeleteMany: vi.fn(),
  userUpdate: vi.fn(),
  resetFindFirst: vi.fn(),
  resetUpdateMany: vi.fn(),
  cookieStore: { set: vi.fn(), get: vi.fn(), delete: vi.fn() },
  tx: {} as Record<string, unknown>,
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("./rate-limit", () => ({ consumeRateLimit: mocks.consumeRateLimit }));
vi.mock("./password", () => ({ hashPassword: mocks.hashPassword, verifyPassword: mocks.verifyPassword }));
vi.mock("./rls", () => ({ withAuthRlsContext: mocks.withAuthRlsContext, setAuthRlsContext: mocks.setAuthRlsContext }));

import { requireRole, signIn } from "./service";

const farmer = {
  id: "00000000-0000-4000-8000-000000000001",
  phoneNumber: "01712345678",
  fullName: "Demo Farmer",
  role: UserRole.FARMER,
  passwordHash: "$2b$12$hash",
  status: AccountStatus.ACTIVE,
  officerVerifiedAt: null,
  disabledAt: null,
};

describe("auth identity service", () => {
  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx = {
      user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
      authSession: { create: mocks.sessionCreate, findFirst: mocks.sessionFindFirst, deleteMany: mocks.sessionDeleteMany },
      passwordResetToken: { findFirst: mocks.resetFindFirst, updateMany: mocks.resetUpdateMany },
    };
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, attempts: 1, retryAfterSeconds: 0 });
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.withAuthRlsContext.mockImplementation(async (_context, operation) => operation(mocks.tx));
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.userFindUnique.mockResolvedValue(farmer);
    mocks.userCreate.mockResolvedValue({ id: farmer.id });
    mocks.tx.user = { findUnique: mocks.userFindUnique, create: mocks.userCreate, update: mocks.userUpdate };
    mocks.sessionCreate.mockResolvedValue({ id: "session" });
    mocks.cookies.mockResolvedValue(mocks.cookieStore);
  });

  it("creates an opaque session for a valid active Farmer login", async () => {
    const result = await signIn({ phoneNumber: "01712345678", password: "demo-password", role: "FARMER" });
    expect(result.ok).toBe(true);
    expect(mocks.sessionCreate).toHaveBeenCalledOnce();
    const createCall = mocks.sessionCreate.mock.calls[0][0];
    expect(createCall.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createCall.data.tokenHash).not.toBe(mocks.cookieStore.set.mock.calls[0][1]);
    expect(mocks.cookieStore.set).toHaveBeenCalledWith("kb_session", expect.any(String), expect.objectContaining({
      httpOnly: true, sameSite: "lax", path: "/", maxAge: 604800,
    }));
  });

  it("does not create a session for an unverified Officer", async () => {
    mocks.userFindUnique.mockResolvedValue({ ...farmer, role: UserRole.OFFICER, status: AccountStatus.PENDING_VERIFICATION });
    const result = await signIn({ phoneNumber: "01712345678", password: "demo-password", role: "OFFICER" });
    expect(result).toEqual({ ok: false, reason: "pending" });
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
    expect(mocks.cookieStore.set).not.toHaveBeenCalled();
  });

  it("does not create a session when the password is wrong", async () => {
    mocks.verifyPassword.mockResolvedValue(false);
    const result = await signIn({ phoneNumber: "01712345678", password: "wrong-password", role: "FARMER" });
    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
  });

  it("rejects a valid password when the selected role does not match the account", async () => {
    const result = await signIn({ phoneNumber: "01712345678", password: "demo-password", role: "ADMIN" });
    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
    expect(mocks.cookieStore.set).not.toHaveBeenCalled();
  });

  it("requires the production Admin code for provisioned Admin login", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ADMIN_ACCESS_CODE", "test-production-admin-code");
    mocks.userFindUnique.mockResolvedValue({ ...farmer, role: UserRole.ADMIN });

    await expect(signIn({ phoneNumber: "01712345678", password: "demo-password", role: "ADMIN" }))
      .resolves.toEqual({ ok: false, reason: "invalid" });
    await expect(signIn({
      phoneNumber: "01712345678", password: "demo-password", role: "ADMIN",
      adminAccessCode: "test-production-admin-code",
    })).resolves.toMatchObject({ ok: true, user: { role: UserRole.ADMIN } });
  });

  it("rejects unauthenticated and wrong-role access at the server role gate", async () => {
    mocks.cookieStore.get.mockReturnValueOnce(undefined);
    await expect(requireRole(UserRole.FARMER)).rejects.toThrow("Unauthorized.");

    mocks.cookieStore.get.mockReturnValue({ value: "opaque-session-token" });
    mocks.sessionFindFirst.mockResolvedValue({ userId: farmer.id });
    mocks.userFindUnique.mockResolvedValue(farmer);
    await expect(requireRole(UserRole.ADMIN)).rejects.toThrow("Unauthorized.");
    await expect(requireRole(UserRole.FARMER)).resolves.toMatchObject({ role: UserRole.FARMER });
  });

  it("registers a Farmer and creates its session in the same RLS transaction", async () => {
    const { registerAccount } = await import("./service");
    mocks.userFindUnique.mockResolvedValue(null);
    const result = await registerAccount({
      firstName: "Amin", lastName: "Uddin", phoneNumber: "01712345678",
      password: "demo-password-123", role: "FARMER",
    });

    expect(result).toEqual({ ok: true, pendingVerification: false });
    expect(mocks.withAuthRlsContext).toHaveBeenCalledWith(
      expect.objectContaining({ authAction: "signup", authPhone: "01712345678", userId: expect.any(String) }),
      expect.any(Function),
    );
    expect(mocks.userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: UserRole.FARMER, status: AccountStatus.ACTIVE, passwordHash: "hashed-password" }),
    }));
    expect(mocks.sessionCreate).toHaveBeenCalledOnce();
    expect(mocks.cookieStore.set).toHaveBeenCalledOnce();
  });

  it("keeps an Officer signup pending and refuses duplicate Farmer signup", async () => {
    vi.stubEnv("DEMO_OFFICER_BYPASS_CODE", "test-officer-code");
    const { registerAccount } = await import("./service");
    mocks.userFindUnique.mockResolvedValue(null);
    const officer = await registerAccount({
      firstName: "Amin", lastName: "Uddin", phoneNumber: "01712345678",
      password: "demo-password-123", role: "OFFICER", officerBypassCode: "test-officer-code",
    });

    expect(officer).toEqual({ ok: true, pendingVerification: true });
    expect(mocks.userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: UserRole.OFFICER, status: AccountStatus.PENDING_VERIFICATION }),
    }));
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
    expect(mocks.cookieStore.set).not.toHaveBeenCalled();

    mocks.userFindUnique.mockResolvedValueOnce({ id: farmer.id });
    const duplicate = await registerAccount({
      firstName: "Amin", lastName: "Uddin", phoneNumber: "01712345678",
      password: "demo-password-123", role: "FARMER",
    });
    expect(duplicate).toEqual({ ok: false, reason: "duplicate" });
  });

  it("requires the configured demo code for Admin signup", async () => {
    vi.stubEnv("DEMO_ADMIN_ACCESS_CODE", "test-admin-code");
    const { registerAccount } = await import("./service");
    mocks.userFindUnique.mockResolvedValue(null);
    const invalid = await registerAccount({
      firstName: "Amin", lastName: "Uddin", phoneNumber: "01712345678",
      password: "demo-password-123", role: "ADMIN", adminAccessCode: "wrong",
    });
    expect(invalid).toEqual({ ok: false, reason: "invalid" });
    expect(mocks.userCreate).not.toHaveBeenCalled();

    const valid = await registerAccount({
      firstName: "Amin", lastName: "Uddin", phoneNumber: "01712345678",
      password: "demo-password-123", role: "ADMIN", adminAccessCode: "test-admin-code",
    });
    expect(valid).toEqual({ ok: true, pendingVerification: false });
    expect(mocks.userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: UserRole.ADMIN, status: AccountStatus.ACTIVE }),
    }));
  });
});
