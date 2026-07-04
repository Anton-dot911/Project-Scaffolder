import { describe, expect, it } from "vitest";
import { parseHealth } from "../src/lib/api.ts";

describe("parseHealth", () => {
  it("accepts a valid service response", () => {
    const payload = { status: "ok", service: "{{project_name}}" };
    expect(parseHealth(payload)).toEqual(payload);
  });

  it("rejects a malformed response", () => {
    expect(() => parseHealth({ status: "nope" })).toThrow();
  });
});
