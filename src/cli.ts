#!/usr/bin/env node
import { realpathSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Command, CommanderError } from "commander";
import prompts from "prompts";
import { PROJECT_NAME_PATTERN, TEMPLATES, type TemplateDef } from "./config.ts";
import { checkTargetDir, generate, isValidProjectName } from "./generate.ts";

export interface CliOptions {
  template?: string;
  git: boolean;
  interactive: boolean;
}

export interface ParsedArgs {
  projectName: string;
  options: CliOptions;
}

export function buildProgram(): Command {
  return new Command("antlab-create")
    .description("Generate a project skeleton from antlab templates")
    .argument("<project-name>", `project name matching ${PROJECT_NAME_PATTERN}`)
    .option(
      "--template <name>",
      `skip interactive selection (${TEMPLATES.map((t) => t.name).join("|")})`,
    )
    .option("--no-git", "skip git init + first commit")
    .option("--no-interactive", "fail instead of prompting (CI use)")
    .exitOverride();
}

// argv is user args only (no node/script entries). Throws CommanderError on
// missing/unknown args because of exitOverride(); main() maps that to exit 1.
// A leading "--" (forwarded verbatim by `pnpm dev -- ...`) is ignored.
export function parseArgs(argv: string[]): ParsedArgs {
  const program = buildProgram();
  program.parse(argv[0] === "--" ? argv.slice(1) : argv, { from: "user" });
  const projectName = program.processedArgs[0] as string;
  return { projectName, options: program.opts<CliOptions>() };
}

export async function main(argv: string[], cwd: string = process.cwd()): Promise<number> {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    if (error instanceof CommanderError) {
      const wasInformational =
        error.code === "commander.helpDisplayed" || error.code === "commander.version";
      return wasInformational ? 0 : 1;
    }
    throw error;
  }
  const { projectName, options } = parsed;

  if (!isValidProjectName(projectName)) {
    console.error(
      `Invalid project name "${projectName}": must match ${PROJECT_NAME_PATTERN} ` +
        "(lowercase letter first, then lowercase letters, digits or hyphens; 2-41 chars).",
    );
    return 1;
  }

  let template: TemplateDef | undefined;
  // The target-dir confirmation is part of the interactive flow; --template
  // opts into flag-driven (non-interactive) usage, so it skips both prompts.
  let confirmTargetDir = false;

  if (options.template !== undefined) {
    template = TEMPLATES.find((t) => t.name === options.template);
    if (template === undefined) {
      console.error(
        `Unknown template "${options.template}". Available: ${TEMPLATES.map((t) => t.name).join(", ")}.`,
      );
      return 3;
    }
  } else if (!options.interactive) {
    console.error("--no-interactive requires --template <name>.");
    return 1;
  } else {
    const answer = await prompts({
      type: "select",
      name: "template",
      message: "Select a template",
      choices: TEMPLATES.map((t) => ({
        title: t.name,
        description: t.description,
        value: t.name,
      })),
    });
    template = TEMPLATES.find((t) => t.name === answer.template);
    if (template === undefined) {
      console.error("Aborted.");
      return 1;
    }
    confirmTargetDir = true;
  }

  const targetDir = path.resolve(cwd, projectName);

  if (checkTargetDir(targetDir) === "occupied") {
    console.error(`Target directory ${targetDir} already exists and is not empty.`);
    return 2;
  }

  if (confirmTargetDir) {
    const answer = await prompts({
      type: "confirm",
      name: "confirmed",
      message: `Generate ${template.name} into ${targetDir}?`,
      initial: true,
    });
    if (answer.confirmed !== true) {
      console.error("Aborted.");
      return 1;
    }
  }

  generate({ projectName, template, targetDir, git: options.git });

  console.log(`Created ${projectName} (template: ${template.name}) at ${targetDir}`);
  console.log("");
  console.log("Next steps:");
  console.log(`  cd ${projectName}`);
  for (const note of template.postGenNotes) {
    console.log(`  ${note}`);
  }
  return 0;
}

// True when this file is the executed entry point (pnpm dev, dist/cli.js,
// npx bin symlink), false when imported by tests.
function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  process.exitCode = await main(process.argv.slice(2));
}
