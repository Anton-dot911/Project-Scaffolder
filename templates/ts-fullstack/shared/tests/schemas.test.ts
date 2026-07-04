import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "../src/index.ts";

describe("healthResponseSchema", () => {
  it("accepts a valid payload", () => {
    expect(healthResponseSchema.parse({ status: "ok", service: "api" })).toEqual({
      status: "ok",
      service: "api",
    });
  });

  it("rejects an unexpected status", () => {
    expect(healthResponseSchema.safeParse({ status: "down", service: "api" }).success).toBe(false);
  });
});
