import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import prompts from "prompts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../../src/cli.ts";

describe("main exit codes", () => {
  let cwd: string;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cwd = mkdtempSync(path.join(os.tmpdir(), "antlab-create-test-"));
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const lastError = () => String(errorSpy.mock.calls.at(-1)?.[0] ?? "");

  it("returns 0 and creates the target dir with --template and --no-git", async () => {
    await expect(main(["demo", "--template", "ts-cli", "--no-git"], cwd)).resolves.toBe(0);
    expect(existsSync(path.join(cwd, "demo"))).toBe(true);
  });

  it("returns 0 when the target dir exists but is empty", async () => {
    mkdirSync(path.join(cwd, "demo"));
    await expect(main(["demo", "--template", "ts-cli", "--no-git"], cwd)).resolves.toBe(0);
  });

  it("returns 2 when the target dir exists and is not empty", async () => {
    mkdirSync(path.join(cwd, "demo"));
    writeFileSync(path.join(cwd, "demo", "file.txt"), "hello");
    await expect(main(["demo", "--template", "ts-cli", "--no-git"], cwd)).resolves.toBe(2);
    expect(lastError()).toContain("already exists and is not empty");
  });

  it("returns 3 for an unknown template", async () => {
    await expect(main(["demo", "--template", "rust-wasm"], cwd)).resolves.toBe(3);
    expect(lastError()).toContain('Unknown template "rust-wasm"');
    expect(existsSync(path.join(cwd, "demo"))).toBe(false);
  });

  it("returns 1 for an invalid project name", async () => {
    await expect(main(["My_App", "--template", "ts-cli"], cwd)).resolves.toBe(1);
    expect(lastError()).toContain("Invalid project name");
  });

  it("returns 1 when --no-interactive is set without --template", async () => {
    await expect(main(["demo", "--no-interactive"], cwd)).resolves.toBe(1);
    expect(lastError()).toContain("--no-interactive requires --template");
    expect(existsSync(path.join(cwd, "demo"))).toBe(false);
  });

  it("returns 1 when the project name argument is missing", async () => {
    await expect(main([], cwd)).resolves.toBe(1);
  });

  it("returns 0 for --help", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await expect(main(["--help"], cwd)).resolves.toBe(0);
  });

  it("runs the interactive flow: select template, confirm dir, generate", async () => {
    prompts.inject(["ts-cli", true]);
    await expect(main(["demo"], cwd)).resolves.toBe(0);
    expect(existsSync(path.join(cwd, "demo"))).toBe(true);
  });

  it("returns 1 and creates nothing when the dir confirmation is declined", async () => {
    prompts.inject(["ts-cli", false]);
    await expect(main(["demo"], cwd)).resolves.toBe(1);
    expect(existsSync(path.join(cwd, "demo"))).toBe(false);
  });
});
