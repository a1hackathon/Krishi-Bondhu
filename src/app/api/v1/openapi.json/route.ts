import { openApiV1 } from "@/server/openapi";

export function GET() {
  return Response.json(openApiV1, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
