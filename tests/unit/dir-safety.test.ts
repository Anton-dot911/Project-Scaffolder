import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkTargetDir } from "../../src/generate.ts";

describe("checkTargetDir", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "antlab-create-test-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("reports a missing path", () => {
    expect(checkTargetDir(path.join(tmp, "nope"))).toBe("missing");
  });

  it("reports an empty directory", () => {
    const dir = path.join(tmp, "empty");
    mkdirSync(dir);
    expect(checkTargetDir(dir)).toBe("empty");
  });

  it("reports a non-empty directory as occupied", () => {
    const dir = path.join(tmp, "full");
    mkdirSync(dir);
    writeFileSync(path.join(dir, "file.txt"), "hello");
    expect(checkTargetDir(dir)).toBe("occupied");
  });

  it("reports a directory containing only a dotfile as occupied", () => {
    const dir = path.join(tmp, "dotted");
    mkdirSync(dir);
    writeFileSync(path.join(dir, ".env"), "");
    expect(checkTargetDir(dir)).toBe("occupied");
  });

  it("reports a regular file at the target path as occupied", () => {
    const file = path.join(tmp, "file");
    writeFileSync(file, "hello");
    expect(checkTargetDir(file)).toBe("occupied");
  });
});
