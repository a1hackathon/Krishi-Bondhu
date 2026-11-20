import "server-only";

import bcrypt from "bcryptjs";
import { BCRYPT_COST } from "./crypto";

export const MAX_BCRYPT_PASSWORD_BYTES = 72;

export async function hashPassword(password: string): Promise<string> {
  const bytes = Buffer.byteLength(password, "utf8");
  if (bytes < 8 || bytes > MAX_BCRYPT_PASSWORD_BYTES) {
    throw new Error("Password must be at least 8 characters and no more than 72 UTF-8 bytes.");
  }
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, passwordHash: string | null): Promise<boolean> {
  if (!passwordHash || Buffer.byteLength(password, "utf8") > MAX_BCRYPT_PASSWORD_BYTES) return false;
  return bcrypt.compare(password, passwordHash);
}
