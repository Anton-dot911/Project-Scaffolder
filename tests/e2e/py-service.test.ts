import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SUBSTITUTION_EXTENSIONS } from "../../src/config.ts";
import { shouldSubstitute } from "../../src/generate.ts";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROJECT_NAME = "demo-service";

// Release-gate test (CLAUDE.md rule 3): generate a real project from the
// py-service template, install its dependencies with uv, and prove the
// generated project's own ruff, mypy and pytest pass.
describe("py-service template e2e", () => {
  let tmp: string;
  let projectDir: string;

  // stderr is inherited so uv's install/progress output is visible in the
  // e2e log; stdout is captured for assertions and echoed afterwards.
  const runInProject = (command: string, args: string[]): string => {
    const output = execFileSync(command, args, {
      cwd: projectDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    });
    process.stdout.write(output);
    return output;
  };

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
        "py-service",
        "--no-git",
      ],
      { cwd: tmp, encoding: "utf8", stdio: "pipe" },
    );
  });

  afterAll(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("substitutes placeholders and leaves no {{ in substituted files", () => {
    expect(readFileSync(path.join(projectDir, "pyproject.toml"), "utf8")).toContain(
      `name = "${PROJECT_NAME}"`,
    );
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

  it("installs dependencies with uv", () => {
    runInProject("uv", ["sync"]);
  });

  it("passes its own ruff (lint + format)", () => {
    runInProject("uv", ["run", "ruff", "check", "."]);
    runInProject("uv", ["run", "ruff", "format", "--check", "."]);
  });

  it("passes its own mypy", () => {
    runInProject("uv", ["run", "mypy"]);
  });

  it("passes its own pytest, with llm smoke tests deselected", () => {
    const output = runInProject("uv", ["run", "pytest", "-v"]);
    expect(output).toContain("test_health_returns_ok");
    expect(output).toMatch(/1 passed/);
    expect(output).toMatch(/1 deselected/);
  });

  it("serves /health from the generated FastAPI app", () => {
    const output = runInProject("uv", [
      "run",
      "python",
      "-c",
      [
        "from fastapi.testclient import TestClient",
        "from app.main import app",
        "print(TestClient(app).get('/health').json())",
      ].join("\n"),
    ]);
    expect(output).toContain("{'status': 'ok'}");
  });
});
