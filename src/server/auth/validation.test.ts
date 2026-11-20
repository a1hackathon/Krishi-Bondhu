import { describe, expect, it } from "vitest";
import { normalizeBangladeshPhoneNumber, phoneNumberSchema, signUpInputSchema } from "./validation";

describe("auth input validation", () => {
  it("normalizes country-code and formatted Bangladesh phone numbers", () => {
    expect(normalizeBangladeshPhoneNumber("+880 1712-345678")).toBe("01712345678");
    expect(phoneNumberSchema.parse("01712 345678")).toBe("01712345678");
  });

  it("rejects invalid numbers and incomplete signup input", () => {
    expect(phoneNumberSchema.safeParse("12345").success).toBe(false);
    expect(signUpInputSchema.safeParse({ phoneNumber: "01712345678", role: "ADMIN" }).success).toBe(false);
  });

  it("accepts valid names, phone, password, and role-specific code fields", () => {
    const result = signUpInputSchema.safeParse({
      firstName: "Amin", lastName: "Uddin", phoneNumber: "+8801712345678",
      password: "demopassword1", role: "OFFICER", officerBypassCode: "demo-code",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phoneNumber).toBe("01712345678");
  });
});
