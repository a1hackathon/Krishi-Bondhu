import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieStore: { set: vi.fn(), get: vi.fn(), delete: vi.fn() },
}));

vi.mock("next/headers", () => ({ cookies: async () => mocks.cookieStore }));

const enabled = process.env.RUN_AUTH_DB_INTEGRATION === "1";
const integration = describe.skipIf(!enabled)("database-backed auth service", () => {
  let auth: typeof import("./service");
  let db: typeof import("@/server/db").db;
  const password = "Demo-Integ-Password-123";
  const phone = () => `01${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0")}`;

  beforeAll(async () => {
    auth = await import("./service");
    ({ db } = await import("@/server/db"));
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  it("registers and signs in an active Farmer through app_runtime", async () => {
    const number = phone();
    const created = await auth.registerAccount({
      firstName: "Demo", lastName: "Farmer", phoneNumber: number, password,
      role: "FARMER",
    });
    expect(created).toEqual({ ok: true, pendingVerification: false });
    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      "kb_session", expect.any(String), expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );

    mocks.cookieStore.set.mockClear();
    await expect(auth.signIn({ phoneNumber: number, password: "Wrong-password-123", role: "FARMER" }))
      .resolves.toEqual({ ok: false, reason: "invalid" });
    expect(mocks.cookieStore.set).not.toHaveBeenCalled();

    const signedIn = await auth.signIn({ phoneNumber: number, password, role: "FARMER" });
    expect(signedIn.ok).toBe(true);
    expect(mocks.cookieStore.set).toHaveBeenCalledOnce();

    const duplicate = await auth.registerAccount({
      firstName: "Demo", lastName: "Farmer", phoneNumber: number, password,
      role: "FARMER",
    });
    expect(duplicate).toEqual({ ok: false, reason: "duplicate" });
  });

  it("keeps demo Officers pending and permits Admin only with the preview code", async () => {
    const officerPhone = phone();
    mocks.cookieStore.set.mockClear();
    const officer = await auth.registerAccount({
      firstName: "Demo", lastName: "Officer", phoneNumber: officerPhone, password,
      role: "OFFICER", officerBypassCode: process.env.DEMO_OFFICER_BYPASS_CODE,
    });
    expect(officer).toEqual({ ok: true, pendingVerification: true });
    expect(mocks.cookieStore.set).not.toHaveBeenCalled();
    await expect(auth.signIn({ phoneNumber: officerPhone, password, role: "OFFICER" }))
      .resolves.toEqual({ ok: false, reason: "pending" });

    const adminPhone = phone();
    const admin = await auth.registerAccount({
      firstName: "Demo", lastName: "Admin", phoneNumber: adminPhone, password,
      role: "ADMIN", adminAccessCode: process.env.DEMO_ADMIN_ACCESS_CODE,
    });
    expect(admin).toEqual({ ok: true, pendingVerification: false });
    await expect(auth.signIn({ phoneNumber: adminPhone, password, role: "ADMIN", adminAccessCode: "wrong" }))
      .resolves.toEqual({ ok: false, reason: "invalid" });
    await expect(auth.signIn({ phoneNumber: adminPhone, password, role: "ADMIN", adminAccessCode: process.env.DEMO_ADMIN_ACCESS_CODE }))
      .resolves.toMatchObject({ ok: true, user: { role: "ADMIN" } });
  });

  it("consumes a one-use password reset token and changes the password", async () => {
    const number = phone();
    await auth.registerAccount({ firstName: "Reset", lastName: "Farmer", phoneNumber: number, password, role: "FARMER" });
    const token = await auth.createPasswordResetToken(number);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await expect(auth.resetPassword({ token: token!, newPassword: "New-Demo-Password-456" })).resolves.toBe(true);
    await expect(auth.resetPassword({ token: token!, newPassword: "Other-Demo-Password-789" })).resolves.toBe(false);
    await expect(auth.signIn({ phoneNumber: number, password: "New-Demo-Password-456", role: "FARMER" }))
      .resolves.toMatchObject({ ok: true });
  });
});

void integration;
