import { describe, expect, it } from "vitest";
import { isSameOriginAction, isSameOriginMutation } from "./csrf";

describe("same-origin mutation guard", () => {
  it("allows safe methods and same-origin form submissions", () => {
    expect(isSameOriginMutation(new Request("https://demo.test/api", { method: "GET" }))).toBe(true);
    expect(isSameOriginMutation(new Request("https://demo.test/api", { method: "POST", headers: { origin: "https://demo.test" } }))).toBe(true);
  });

  it("rejects missing, null, or cross-origin mutation origins", () => {
    expect(isSameOriginMutation(new Request("https://demo.test/api", { method: "POST" }))).toBe(false);
    expect(isSameOriginMutation(new Request("https://demo.test/api", { method: "POST", headers: { origin: "null" } }))).toBe(false);
    expect(isSameOriginMutation(new Request("https://demo.test/api", { method: "POST", headers: { origin: "https://evil.test" } }))).toBe(false);
  });
});

describe("server action origin guard", () => {
  it("requires a browser origin matching the request host", () => {
    expect(isSameOriginAction(new Headers({ origin: "http://localhost:3100", host: "localhost:3100", "x-forwarded-proto": "https" }))).toBe(true);
    expect(isSameOriginAction(new Headers({ origin: "https://evil.test", host: "demo.test" }))).toBe(false);
    expect(isSameOriginAction(new Headers({ host: "demo.test" }))).toBe(false);
  });
});
