import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

const settingNames = {
  userId: "app.user_id",
  authPhone: "app.auth_phone",
  authAction: "app.auth_action",
  sessionTokenHash: "app.session_token_hash",
  passwordResetTokenHash: "app.password_reset_token_hash",
  rateLimitKeyHash: "app.rate_limit_key_hash",
} as const;

export type AuthRlsContext = Partial<Record<keyof typeof settingNames, string>>;

export async function setAuthRlsContext(tx: Prisma.TransactionClient, context: AuthRlsContext): Promise<void> {
  for (const [key, value] of Object.entries(context) as [keyof typeof settingNames, string][]) {
    if (!value) continue;
    const setting = settingNames[key];
    await tx.$queryRaw`SELECT set_config(${setting}, ${value}, true)`;
  }
}

export async function withAuthRlsContext<T>(
  context: AuthRlsContext,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await setAuthRlsContext(tx, context);
    return operation(tx);
  }, { maxWait: 15_000, timeout: 15_000 });
}
