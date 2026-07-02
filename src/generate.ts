import { mkdirSync, readdirSync, statSync } from "node:fs";
import { PROJECT_NAME_PATTERN, type GenerateOptions } from "./config.ts";

export function isValidProjectName(name: string): boolean {
  return PROJECT_NAME_PATTERN.test(name);
}

export type TargetDirState = "missing" | "empty" | "occupied";

// "occupied" covers both a non-empty directory and a non-directory entry at
// the target path; either way generation must fail (exit code 2), never
// overwrite.
export function checkTargetDir(targetDir: string): TargetDirState {
  let stat;
  try {
    stat = statSync(targetDir);
  } catch {
    return "missing";
  }
  if (!stat.isDirectory()) {
    return "occupied";
  }
  return readdirSync(targetDir).length === 0 ? "empty" : "occupied";
}

// T1 scope: only creates the target directory. Copying the template dir,
// {{var}} substitution and git init + first commit land in T2.
export function generate(options: GenerateOptions): void {
  mkdirSync(options.targetDir, { recursive: true });
}
