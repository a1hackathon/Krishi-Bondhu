import { describe, expect, it } from "vitest";
import { getHealth } from "./health";

describe("getHealth", () => {
  it("reports ok with an ISO timestamp for the given instant", () => {
    const now = new Date("2026-01-02T03:04:05.000Z");
    expect(getHealth(now, "1.2.3")).toEqual({
      status: "ok",
      version: "1.2.3",
      timestamp: "2026-01-02T03:04:05.000Z",
    });
  });
});
