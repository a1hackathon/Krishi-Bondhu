import "server-only";

import { hashRateLimitKey } from "./crypto";
import { withAuthRlsContext } from "./rls";

export type RateLimitResult = {
  allowed: boolean;
  attempts: number;
  retryAfterSeconds: number;
};

export async function consumeRateLimit(
  action: string,
  subject: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const keyHash = hashRateLimitKey(action, subject);
  const rows = await withAuthRlsContext({ rateLimitKeyHash: keyHash }, (tx) => tx.$queryRaw<{
    attempts: number;
    windowStartedAt: Date;
  }[]>`
    INSERT INTO "auth_rate_limits" ("keyHash", "windowStartedAt", "attempts")
    VALUES (${keyHash}, CURRENT_TIMESTAMP, 1)
    ON CONFLICT ("keyHash") DO UPDATE SET
      "attempts" = CASE
        WHEN "auth_rate_limits"."windowStartedAt" <= CURRENT_TIMESTAMP - (${windowSeconds} * INTERVAL '1 second') THEN 1
        ELSE "auth_rate_limits"."attempts" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "auth_rate_limits"."windowStartedAt" <= CURRENT_TIMESTAMP - (${windowSeconds} * INTERVAL '1 second') THEN CURRENT_TIMESTAMP
        ELSE "auth_rate_limits"."windowStartedAt"
      END
    RETURNING "attempts", "windowStartedAt"
  `);

  const result = rows[0];
  if (!result) throw new Error("Rate-limit counter was not returned.");
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((result.windowStartedAt.getTime() + windowSeconds * 1000 - Date.now()) / 1000),
  );
  return {
    allowed: result.attempts <= maxAttempts,
    attempts: result.attempts,
    retryAfterSeconds: result.attempts <= maxAttempts ? 0 : retryAfterSeconds,
  };
}

export function getClientIpAddress(request: Request): string {
  // Vercel overwrites x-forwarded-for with the public client IP; other deployments
  // should only trust this header when their reverse proxy also replaces it.
  const ip = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return ip && ip.length <= 64 ? ip : "unknown";
}
