// OpenAPI 3.1 contract for the versioned REST API. Keep it in step with the route handlers under src/app/api/v1.

export const openApiV1 = {
  openapi: "3.1.0",
  info: {
    title: "X API",
    version: "1.0.0",
    description: "Versioned REST API for the X farming platform.",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/health": {
      get: {
        operationId: "getHealth",
        summary: "Application liveness",
        responses: {
          "200": {
            description: "The application is running.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status", "version", "timestamp"],
                  properties: {
                    status: { type: "string", enum: ["ok"] },
                    version: { type: "string" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
