import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";

describe("GET /health", () => {
  it("returns ok with the service name", async () => {
    const app = buildApp({ logger: false });
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "{{project_name}}",
    });
  });
});
