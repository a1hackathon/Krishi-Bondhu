import "server-only";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isSameOriginMutation(request: Request): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;
  const originHeader = request.headers.get("origin");
  if (!originHeader || originHeader === "null") return false;

  try {
    return new URL(originHeader).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function assertSameOriginMutation(request: Request): void {
  if (!isSameOriginMutation(request)) {
    throw new Error("Cross-origin state changes are not allowed.");
  }
}

export function isSameOriginAction(headers: Headers): boolean {
  const originHeader = headers.get("origin");
  const host = headers.get("host");
  if (!originHeader || !host) return false;
  try {
    const origin = new URL(originHeader);
    return (origin.protocol === "https:" || origin.protocol === "http:") && origin.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}
