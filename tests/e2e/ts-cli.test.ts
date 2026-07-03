import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SUBSTITUTION_EXTENSIONS } from "../../src/config.ts";
import { shouldSubstitute } from "../../src/generate.ts";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROJECT_NAME = "demo-cli";

// Release-gate test (CLAUDE.md rule 3): generate a real project from the
// ts-cli template, install its dependencies, and prove the generated
// project's own lint and test pass.
describe("ts-cli template e2e", () => {
  let tmp: string;
  let projectDir: string;

  const runInProject = (command: string, args: string[]): string =>
    execFileSync(command, args, { cwd: projectDir, encoding: "utf8", stdio: "pipe" });

  beforeAll(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "antlab-create-e2e-"));
    projectDir = path.join(tmp, PROJECT_NAME);
    execFileSync(
      process.execPath,
      [
        "--disable-warning=ExperimentalWarning",
        path.join(PACKAGE_ROOT, "src/cli.ts"),
        PROJECT_NAME,
        "--template",
        "ts-cli",
        "--no-git",
      ],
      { cwd: tmp, encoding: "utf8", stdio: "pipe" },
    );
  });

  afterAll(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("substitutes placeholders and leaves no {{ in substituted files", () => {
    const pkg = JSON.parse(readFileSync(path.join(projectDir, "package.json"), "utf8")) as {
      name: string;
    };
    expect(pkg.name).toBe(PROJECT_NAME);
    expect(readFileSync(path.join(projectDir, "LICENSE"), "utf8")).toContain(
      `Copyright (c) ${new Date().getFullYear()}`,
    );

    const scan = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(entryPath);
        } else if (shouldSubstitute(entry.name, SUBSTITUTION_EXTENSIONS)) {
          expect(readFileSync(entryPath, "utf8"), entryPath).not.toContain("{{");
        }
      }
    };
    scan(projectDir);
  });

  it("installs dependencies", () => {
    // No lockfile exists at scaffold time, so opt out of pnpm's CI default.
    runInProject("pnpm", ["install", "--no-frozen-lockfile"]);
  });

  it("passes its own lint", () => {
    runInProject("pnpm", ["lint"]);
  });

  it("passes its own typecheck", () => {
    runInProject("pnpm", ["typecheck"]);
  });

  it("passes its own tests", () => {
    runInProject("pnpm", ["test"]);
  });

  it("runs the built CLI", () => {
    runInProject("pnpm", ["build"]);
    const output = runInProject(process.execPath, ["dist/cli.js", "antlab"]);
    expect(output.trim()).toBe(`Hello, antlab! This is ${PROJECT_NAME}.`);
  });
});
