// Structured logger: one JSON object per line, written to stdout/stderr so Vercel captures it.
// Framework-independent; safe to import from route handlers, jobs, and domain modules.

export type LogLevel = "debug" | "info" | "warn" | "error";

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function currentLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  return raw && raw in ORDER ? (raw as LogLevel) : "info";
}

export function log(
  level: LogLevel,
  message: string,
  fields: Record<string, unknown> = {},
): void {
  if (ORDER[level] < ORDER[currentLevel()]) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields });
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => log("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => log("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => log("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => log("error", message, fields),
};
