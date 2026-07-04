import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SUBSTITUTION_EXTENSIONS, type TemplateDef } from "../../src/config.ts";
import { buildPlaceholders, generate, shouldSubstitute, substitute } from "../../src/generate.ts";

const PLACEHOLDERS = buildPlaceholders("my-app", "Test Author");

describe("buildPlaceholders", () => {
  it("derives the snake_case name from the project name", () => {
    expect(PLACEHOLDERS.project_name).toBe("my-app");
    expect(PLACEHOLDERS.project_name_snake).toBe("my_app");
  });

  it("uses the current year and the given author", () => {
    expect(PLACEHOLDERS.year).toBe(String(new Date().getFullYear()));
    expect(PLACEHOLDERS.author).toBe("Test Author");
  });
});

describe("substitute", () => {
  it("replaces every known placeholder", () => {
    expect(
      substitute("# {{project_name}} ({{project_name_snake}}) © {{year}} {{author}}", PLACEHOLDERS),
    ).toBe(`# my-app (my_app) © ${PLACEHOLDERS.year} Test Author`);
  });

  it("replaces repeated occurrences", () => {
    expect(substitute("{{project_name}}/{{project_name}}", PLACEHOLDERS)).toBe("my-app/my-app");
  });

  it("leaves unknown {{...}} sequences untouched", () => {
    expect(substitute("${{ secrets.TOKEN }} {{unknown_var}}", PLACEHOLDERS)).toBe(
      "${{ secrets.TOKEN }} {{unknown_var}}",
    );
  });
});

describe("shouldSubstitute", () => {
  it("matches allowlisted extensions including multi-part ones", () => {
    expect(shouldSubstitute("README.md", SUBSTITUTION_EXTENSIONS)).toBe(true);
    expect(shouldSubstitute(".env.example", SUBSTITUTION_EXTENSIONS)).toBe(true);
    expect(shouldSubstitute("ci.yml", SUBSTITUTION_EXTENSIONS)).toBe(true);
    expect(shouldSubstitute("LICENSE", SUBSTITUTION_EXTENSIONS)).toBe(true);
  });

  it("rejects lockfiles and binaries", () => {
    expect(shouldSubstitute("pnpm-lock.yaml", SUBSTITUTION_EXTENSIONS)).toBe(false);
    expect(shouldSubstitute("logo.png", SUBSTITUTION_EXTENSIONS)).toBe(false);
    expect(shouldSubstitute("notes.txt", SUBSTITUTION_EXTENSIONS)).toBe(false);
  });
});

describe("generate", () => {
  let tmp: string;
  let templateDir: string;
  let targetDir: string;
  let template: TemplateDef;
  // PNG-like bytes: NUL bytes plus a literal placeholder that must survive.
  const binaryContent = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02]),
    Buffer.from("{{project_name}}"),
    Buffer.from([0x00, 0xff, 0xfe]),
  ]);
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "antlab-create-test-"));
    templateDir = path.join(tmp, "template");
    targetDir = path.join(tmp, "out");

    // Pin git config to a known global file so author resolution and commit
    // identity are deterministic regardless of the machine running the tests.
    for (const key of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"]) {
      savedEnv[key] = process.env[key];
    }
    const gitconfig = path.join(tmp, "gitconfig");
    writeFileSync(gitconfig, "[user]\n\tname = Test Author\n\temail = test@example.com\n");
    process.env.GIT_CONFIG_GLOBAL = gitconfig;
    process.env.GIT_CONFIG_SYSTEM = "/dev/null";

    mkdirSync(path.join(templateDir, "src"), { recursive: true });
    writeFileSync(
      path.join(templateDir, "README.md"),
      "# {{project_name}}\n{{project_name_snake}} © {{year}} {{author}}\n",
    );
    writeFileSync(path.join(templateDir, ".env.example"), "APP_NAME={{project_name}}\n");
    writeFileSync(
      path.join(templateDir, "src", "index.ts"),
      'export const name = "{{project_name}}";\n',
    );
    writeFileSync(path.join(templateDir, "notes.txt"), "verbatim {{project_name}}\n");
    writeFileSync(path.join(templateDir, "_gitignore"), "node_modules/\n");
    writeFileSync(path.join(templateDir, "pnpm-lock.yaml"), "name: {{project_name}}\n");
    writeFileSync(path.join(templateDir, "logo.png"), binaryContent);

    template = {
      name: "ts-cli",
      description: "fixture",
      dir: templateDir,
      substitutionExtensions: SUBSTITUTION_EXTENSIONS,
      postGenNotes: [],
    };
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  const run = (git: boolean) => generate({ projectName: "my-app", template, targetDir, git });

  it("substitutes placeholders in allowlisted files, including nested ones", () => {
    run(false);
    expect(readFileSync(path.join(targetDir, "README.md"), "utf8")).toBe(
      `# my-app\nmy_app © ${new Date().getFullYear()} Test Author\n`,
    );
    expect(readFileSync(path.join(targetDir, ".env.example"), "utf8")).toBe("APP_NAME=my-app\n");
    expect(readFileSync(path.join(targetDir, "src", "index.ts"), "utf8")).toBe(
      'export const name = "my-app";\n',
    );
  });

  it("copies binaries byte-for-byte", () => {
    run(false);
    expect(readFileSync(path.join(targetDir, "logo.png")).equals(binaryContent)).toBe(true);
  });

  it("copies non-allowlisted text files verbatim, placeholders included", () => {
    run(false);
    expect(readFileSync(path.join(targetDir, "notes.txt"), "utf8")).toBe(
      "verbatim {{project_name}}\n",
    );
    expect(readFileSync(path.join(targetDir, "pnpm-lock.yaml"), "utf8")).toBe(
      "name: {{project_name}}\n",
    );
  });

  it("leaves no {{ in any substituted output file", () => {
    run(false);
    const scan = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== ".git") scan(entryPath);
        } else if (shouldSubstitute(entry.name, SUBSTITUTION_EXTENSIONS)) {
          expect(readFileSync(entryPath, "utf8"), entryPath).not.toContain("{{");
        }
      }
    };
    scan(targetDir);
  });

  // npm strips .gitignore files when packing, so templates ship them as
  // _gitignore and the copy step must restore the real name.
  it("renames _gitignore to .gitignore on copy", () => {
    run(false);
    expect(existsSync(path.join(targetDir, "_gitignore"))).toBe(false);
    expect(readFileSync(path.join(targetDir, ".gitignore"), "utf8")).toBe("node_modules/\n");
  });

  it("does not create a git repo when git is false", () => {
    run(false);
    expect(existsSync(path.join(targetDir, ".git"))).toBe(false);
  });

  it("creates a git repo with the conventional first commit when git is true", () => {
    run(true);
    expect(existsSync(path.join(targetDir, ".git"))).toBe(true);
    const log = execFileSync("git", ["log", "-1", "--format=%s%n%an"], {
      cwd: targetDir,
      encoding: "utf8",
    }).trim();
    expect(log).toBe("chore: scaffold from antlab-create\nTest Author");
    const status = execFileSync("git", ["status", "--porcelain"], {
      cwd: targetDir,
      encoding: "utf8",
    }).trim();
    expect(status).toBe("");
  });

  it('falls back to author "antlab" when git config has no user.name', () => {
    process.env.GIT_CONFIG_GLOBAL = "/dev/null";
    run(false);
    expect(readFileSync(path.join(targetDir, "README.md"), "utf8")).toContain(
      `© ${new Date().getFullYear()} antlab`,
    );
  });
});
