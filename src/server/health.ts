// Domain-level health check. No Next.js types here, so it can be reused by other services.
// Liveness only: it reports that the app is running. It does not probe the database,
// so a database outage does not take the whole app out of rotation.

export type HealthReport = {
  status: "ok";
  version: string;
  timestamp: string;
};

export function getHealth(now: Date, version = process.env.npm_package_version ?? "unknown"): HealthReport {
  return {
    status: "ok",
    version,
    timestamp: now.toISOString(),
  };
}
