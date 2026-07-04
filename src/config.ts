export interface TemplateDef {
  name: "ts-fullstack" | "py-service" | "ts-cli";
  description: string;
  dir: string; // templates/<name>
  substitutionExtensions: string[]; // [".ts",".tsx",".py",".md",".json",".yml",".toml",".html",".env.example"]
  postGenNotes: string[]; // printed next steps
}

export interface GenerateOptions {
  projectName: string; // validated: /^[a-z][a-z0-9-]{1,40}$/
  template: TemplateDef;
  targetDir: string;
  git: boolean;
}

export const PROJECT_NAME_PATTERN = /^[a-z][a-z0-9-]{1,40}$/;

// Files whose contents go through {{var}} substitution; everything else is
// copied verbatim (lockfiles, binaries). Matching is by filename suffix, so
// extensionless names like "LICENSE" (MIT text carries {{year}} {{author}})
// can be listed alongside real extensions.
export const SUBSTITUTION_EXTENSIONS: string[] = [
  ".ts",
  ".tsx",
  ".py",
  ".md",
  ".json",
  ".yml",
  ".toml",
  ".html",
  ".env.example",
  "LICENSE",
];

export const TEMPLATES: TemplateDef[] = [
  {
    name: "ts-fullstack",
    description:
      "React + Vite + TS + Tailwind web/, Fastify service/, shared/ types (pnpm workspace)",
    dir: "templates/ts-fullstack",
    substitutionExtensions: SUBSTITUTION_EXTENSIONS,
    postGenNotes: [
      "pnpm install",
      "cp service/.env.example service/.env   # add ANTHROPIC_API_KEY for the llm layer",
      "pnpm dev",
    ],
  },
  {
    name: "py-service",
    description: "FastAPI + Pydantic v2 + pytest + ruff + mypy + Dockerfile",
    dir: "templates/py-service",
    substitutionExtensions: SUBSTITUTION_EXTENSIONS,
    postGenNotes: ["uv sync", "uv run fastapi dev app/main.py"],
  },
  {
    name: "ts-cli",
    description: "Node CLI with commander and tsup build",
    dir: "templates/ts-cli",
    substitutionExtensions: SUBSTITUTION_EXTENSIONS,
    postGenNotes: ["pnpm install", "pnpm dev"],
  },
];
