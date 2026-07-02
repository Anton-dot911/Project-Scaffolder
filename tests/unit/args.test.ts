import { CommanderError } from "commander";
import { describe, expect, it } from "vitest";
import { parseArgs } from "../../src/cli.ts";

describe("parseArgs", () => {
  it("parses the project name with defaults (git on, interactive on, no template)", () => {
    const { projectName, options } = parseArgs(["demo"]);
    expect(projectName).toBe("demo");
    expect(options.git).toBe(true);
    expect(options.interactive).toBe(true);
    expect(options.template).toBeUndefined();
  });

  it("parses --template", () => {
    const { options } = parseArgs(["demo", "--template", "ts-cli"]);
    expect(options.template).toBe("ts-cli");
  });

  it("parses --no-git", () => {
    const { options } = parseArgs(["demo", "--no-git"]);
    expect(options.git).toBe(false);
  });

  it("parses --no-interactive", () => {
    const { options } = parseArgs(["demo", "--no-interactive"]);
    expect(options.interactive).toBe(false);
  });

  it("parses all flags together", () => {
    const { projectName, options } = parseArgs([
      "my-app",
      "--template",
      "py-service",
      "--no-git",
      "--no-interactive",
    ]);
    expect(projectName).toBe("my-app");
    expect(options).toMatchObject({ template: "py-service", git: false, interactive: false });
  });

  it("ignores a leading -- forwarded by pnpm dev", () => {
    const { projectName, options } = parseArgs(["--", "demo", "--template", "ts-cli", "--no-git"]);
    expect(projectName).toBe("demo");
    expect(options).toMatchObject({ template: "ts-cli", git: false });
  });

  it("throws when the project name is missing", () => {
    expect(() => parseArgs([])).toThrow(CommanderError);
  });

  it("throws on an unknown option", () => {
    expect(() => parseArgs(["demo", "--bogus"])).toThrow(CommanderError);
  });
});
