import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SUBSTITUTION_EXTENSIONS } from "../../src/config.ts";
import { shouldSubstitute } from "../../src/generate.ts";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROJECT_NAME = "demo-fullstack";
const WORKSPACE_PACKAGES = ["shared", "service", "web"] as const;
const SERVICE_PORT = 3179;

// Release-gate test (CLAUDE.md rule 3): generate a real project from the
// ts-fullstack template, install the workspace with pnpm, and prove the
// generated project's own lint, typecheck and test pass in all three packages.
describe("ts-fullstack template e2e", () => {
  let tmp: string;
  let projectDir: string;

  // stderr is inherited so pnpm's install/progress output is visible in the
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
        "ts-fullstack",
        "--no-git",
      ],
      { cwd: tmp, encoding: "utf8", stdio: "pipe" },
    );
  });

  afterAll(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("substitutes placeholders and leaves no {{ in substituted files", () => {
    const rootPkg = JSON.parse(readFileSync(path.join(projectDir, "package.json"), "utf8")) as {
      name: string;
    };
    expect(rootPkg.name).toBe(PROJECT_NAME);
    expect(readFileSync(path.join(projectDir, "LICENSE"), "utf8")).toContain(
      `Copyright (c) ${new Date().getFullYear()}`,
    );
    expect(readFileSync(path.join(projectDir, "service/.env.example"), "utf8")).toContain(
      "ANTHROPIC_API_KEY=",
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

  it("installs the workspace with pnpm", () => {
    // No lockfile exists at scaffold time, so opt out of pnpm's CI default.
    runInProject("pnpm", ["install", "--no-frozen-lockfile"]);
  });

  it("passes its own workspace-wide lint", () => {
    runInProject("pnpm", ["lint"]);
  });

  for (const pkg of WORKSPACE_PACKAGES) {
    it(`passes its own typecheck in ${pkg}/`, () => {
      runInProject("pnpm", ["--filter", `./${pkg}`, "typecheck"]);
    });

    it(`passes its own tests in ${pkg}/`, () => {
      runInProject("pnpm", ["--filter", `./${pkg}`, "test"]);
    });
  }

  it("builds the web app for production", () => {
    runInProject("pnpm", ["--filter", "./web", "build"]);
  });

  // Proves the dev entry point works outside vitest's transform pipeline:
  // plain node runs service TS (and the shared workspace import) directly.
  it("serves /health from the service entry under plain node", async () => {
    const child = spawn(
      process.execPath,
      ["--disable-warning=ExperimentalWarning", "src/index.ts"],
      {
        cwd: path.join(projectDir, "service"),
        env: { ...process.env, PORT: String(SERVICE_PORT) },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let serviceLog = "";
    child.stdout.on("data", (chunk: Buffer) => (serviceLog += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (serviceLog += chunk.toString()));

    try {
      let body: unknown;
      for (let attempt = 0; ; attempt += 1) {
        try {
          const response = await fetch(`http://127.0.0.1:${SERVICE_PORT}/health`);
          expect(response.status).toBe(200);
          body = await response.json();
          break;
        } catch (error) {
          if (attempt >= 50) {
            throw new Error(`service did not start within 10s\n--- log ---\n${serviceLog}`, {
              cause: error,
            });
          }
          await sleep(200);
        }
      }
      expect(body).toEqual({ status: "ok", service: PROJECT_NAME });
    } finally {
      child.kill("SIGTERM");
    }
  });
});
