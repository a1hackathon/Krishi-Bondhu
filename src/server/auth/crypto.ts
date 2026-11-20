import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const BCRYPT_COST = 12;
export const SESSION_TOKEN_BYTES = 32;
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const PASSWORD_RESET_TTL_SECONDS = 60 * 15;

export function createOpaqueToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function hashRateLimitKey(action: string, subject: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 bytes.");
  }
  return createHmac("sha256", secret).update(`${action}:${subject}`, "utf8").digest("hex");
}

export function constantTimeSecretEquals(candidate: string | undefined, configured: string | undefined): boolean {
  if (!candidate || !configured) return false;
  const left = createHash("sha256").update(candidate, "utf8").digest();
  const right = createHash("sha256").update(configured, "utf8").digest();
  return timingSafeEqual(left, right);
}
