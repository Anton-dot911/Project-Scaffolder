import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROJECT_NAME_PATTERN, type GenerateOptions } from "./config.ts";

// Template dirs in config.ts are relative to the package root (works both for
// src/cli.ts dev runs and the dist/ build, which sit one level below root).
const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

export type Placeholders = Record<
  "project_name" | "project_name_snake" | "year" | "author",
  string
>;

export function buildPlaceholders(projectName: string, author: string): Placeholders {
  return {
    project_name: projectName,
    project_name_snake: projectName.replaceAll("-", "_"),
    year: String(new Date().getFullYear()),
    author,
  };
}

// Replaces only the known {{key}} placeholders; any other "{{" sequence is
// left untouched (the placeholder-coverage unit tests catch template typos).
export function substitute(content: string, placeholders: Placeholders): string {
  let result = content;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

// Suffix match instead of path.extname so multi-part entries in the allowlist
// (".env.example") work.
export function shouldSubstitute(fileName: string, extensions: string[]): boolean {
  return extensions.some((ext) => fileName.endsWith(ext));
}

// Reads a git config value; undefined when git is missing or the key is
// unset. cwd matters: run it from the target so the user's global config
// applies, not this package's repo config.
export function readGitConfig(key: string, cwd: string): string | undefined {
  try {
    const value = execFileSync("git", ["config", key], { cwd, encoding: "utf8" }).trim();
    return value === "" ? undefined : value;
  } catch {
    return undefined;
  }
}

function copyTree(
  srcDir: string,
  destDir: string,
  extensions: string[],
  placeholders: Placeholders,
): void {
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destPath);
      copyTree(srcPath, destPath, extensions, placeholders);
    } else if (entry.isFile()) {
      if (shouldSubstitute(entry.name, extensions)) {
        const content = substitute(readFileSync(srcPath, "utf8"), placeholders);
        writeFileSync(destPath, content, { mode: statSync(srcPath).mode });
      } else {
        copyFileSync(srcPath, destPath);
      }
    } else {
      throw new Error(`Unsupported template entry (not a file or directory): ${srcPath}`);
    }
  }
}

function initGitRepo(targetDir: string, author: string, email: string): void {
  const run = (args: string[]) => execFileSync("git", args, { cwd: targetDir, stdio: "pipe" });
  run(["init"]);
  run(["add", "-A"]);
  // -c pins the commit identity to the resolved values so the first commit
  // also works on machines without git user config. --allow-empty keeps
  // generation working while template dirs are still stubs (pre-T3).
  run([
    "-c",
    `user.name=${author}`,
    "-c",
    `user.email=${email}`,
    "commit",
    "--allow-empty",
    "-m",
    "chore: scaffold from antlab-create",
  ]);
}

export function generate(options: GenerateOptions): void {
  const templateDir = path.isAbsolute(options.template.dir)
    ? options.template.dir
    : path.resolve(PACKAGE_ROOT, options.template.dir);

  mkdirSync(options.targetDir, { recursive: true });

  const author = readGitConfig("user.name", options.targetDir) ?? "antlab";
  const placeholders = buildPlaceholders(options.projectName, author);
  copyTree(templateDir, options.targetDir, options.template.substitutionExtensions, placeholders);

  if (options.git) {
    const email = readGitConfig("user.email", options.targetDir) ?? "antlab@localhost";
    initGitRepo(options.targetDir, author, email);
  }
}
