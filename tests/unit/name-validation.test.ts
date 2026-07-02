import { describe, expect, it } from "vitest";
import { isValidProjectName } from "../../src/generate.ts";

describe("isValidProjectName (/^[a-z][a-z0-9-]{1,40}$/)", () => {
  it.each(["demo", "my-app", "ab", "a1", "doc-flow-2", "a" + "b".repeat(40)])(
    "accepts %j",
    (name) => {
      expect(isValidProjectName(name)).toBe(true);
    },
  );

  it.each([
    "", // empty
    "a", // too short (min 2 chars)
    "a" + "b".repeat(41), // too long (max 41 chars)
    "1demo", // must start with a lowercase letter
    "-demo", // must start with a lowercase letter
    "Demo", // no uppercase
    "my_app", // no underscores
    "my app", // no spaces
    "my.app", // no dots
    "démo", // ASCII only
  ])("rejects %j", (name) => {
    expect(isValidProjectName(name)).toBe(false);
  });
});
