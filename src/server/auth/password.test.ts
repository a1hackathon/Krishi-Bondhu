import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password storage", () => {
  it("stores a bcrypt hash and verifies only the matching password", async () => {
    const hash = await hashPassword("demo-password-1");
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    await expect(verifyPassword("demo-password-1", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("rejects passwords outside bcrypt's supported byte length", async () => {
    await expect(hashPassword("short")).rejects.toThrow();
    await expect(hashPassword("é".repeat(37))).rejects.toThrow();
  });
});
