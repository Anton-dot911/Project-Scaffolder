import { describe, expect, it } from "vitest";
import { greet } from "../src/greet.ts";

describe("greet", () => {
  it("greets by name", () => {
    expect(greet("friend")).toBe("Hello, friend! This is {{project_name}}.");
  });
});
