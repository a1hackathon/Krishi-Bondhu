import { connection } from "next/server";
import { getHealth } from "@/server/health";
import { logger } from "@/server/logger";

export async function GET() {
  // Opt out of prerendering so the timestamp is read per request (cacheComponents).
  await connection();
  const report = getHealth(new Date());
  logger.debug("health check", { status: report.status });
  return Response.json(report, {
    headers: { "Cache-Control": "no-store" },
  });
}
