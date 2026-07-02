# PLAN.md — antlab-create Implementation Plan

One task = one session. Minimal version (T1–T4) targets 1 day; T5–T7 complete the tool.

---

## Contracts

### CLI interface

```
npx antlab-create <project-name> [options]

Options:
  --template <ts-fullstack|py-service|ts-cli>   skip interactive selection
  --no-git                                      skip git init + first commit
  --no-interactive                              fail instead of prompting (CI use)

Interactive flow (default): template select → confirm target dir → generate →
print next steps (cd, install command, dev command).
Exit codes: 0 ok; 2 target dir exists and not empty; 3 unknown template.
```

### Templates registry (`src/config.ts`)

```ts
export interface TemplateDef {
  name: "ts-fullstack" | "py-service" | "ts-cli";
  description: string;
  dir: string;                       // templates/<name>
  substitutionExtensions: string[];  // [".ts",".tsx",".py",".md",".json",".yml",".toml",".html",".env.example"]
  postGenNotes: string[];            // printed next steps
}

export interface GenerateOptions {
  projectName: string;               // validated: /^[a-z][a-z0-9-]{1,40}$/
  template: TemplateDef;
  targetDir: string;
  git: boolean;
}
```

### Placeholders (available in all templates)
`{{project_name}}`, `{{project_name_snake}}`, `{{year}}`, `{{author}}` (from git config user.name, fallback "antlab").

### Mandatory content of EVERY template
- `README.md` skeleton (EN): Problem / Solution / Architecture / Setup / Design decisions
- `.env.example`, `.gitignore`, LICENSE (MIT, `{{year}} {{author}}`)
- Lint + format config (ESLint/Prettier or ruff), test runner with one passing example test
- `.github/workflows/ci.yml`: lint + typecheck + test on push
- `CLAUDE.md` skeleton: stack, commands, structure, empty "Hard rules" section to fill per project

### `llm/` module contract (ts-fullstack service/ and py-service)

```ts
// TS: service/src/llm/client.ts
export function createLlm(opts: { project: string; component: string }): Llm;
interface Llm {
  structured<T>(args: {
    promptFile: string;              // prompts/<name>.v<N>.md
    schema: ZodType<T>;
    input: unknown;
    model?: string;                  // default from env LLM_MODEL, fallback "claude-sonnet-4-6"
    temperature?: number;            // default 0
  }): Promise<T>;                    // tool-use + validate + 1 retry with error feedback
}
```

```python
# Python: app/llm/client.py — mirror of the TS contract
def create_llm(project: str, component: str) -> Llm: ...
class Llm:
    def structured(self, *, prompt_file: str, output_model: type[BaseModel],
                   input: Any, model: str | None = None,
                   temperature: float = 0) -> BaseModel: ...
```

Both wrappers: timeout, backoff on 429/529, Meter hook point (`meter.record(...)` no-op stub until Meter exists — interface fixed now).

---

## Tasks

**T1. CLI skeleton.**
commander + prompts flow, name validation, dir-safety check, config registry with the three template defs (template dirs may be empty stubs). Unit tests for arg parsing, validation, exit codes.
DoD: `pnpm dev -- demo --template ts-cli --no-git` creates dir from stub without errors; tests green.

**T2. Generator core.**
Copy engine + `{{var}}` substitution over allowlisted extensions; verbatim copy otherwise; git init + conventional first commit (`chore: scaffold from antlab-create`).
DoD: unit tests: substitution, binary passthrough, no leftover `{{` scan, --no-git respected.

**T3. Template: ts-cli.**
Full working template (commander, tsup, vitest, ESLint/Prettier, CI, README/CLAUDE.md skeletons, one example test).
DoD: e2e — generate → `pnpm install` → `pnpm lint && pnpm test` pass inside generated project.

**T4. Template: py-service.**
FastAPI app with /health, Pydantic v2, pytest example, ruff+mypy, Dockerfile, CI, `app/llm/client.py` per contract (with `@pytest.mark.llm` smoke test skipped by default).
DoD: e2e green (uv install, ruff, mypy, pytest); llm smoke passes manually with a real key.

**T5. Template: ts-fullstack.**
pnpm workspace: `web/` (React+Vite+TS+Tailwind), `service/` (Fastify + llm client per contract), `shared/` (Zod schemas package), root scripts, CI matrix.
DoD: e2e green for all three workspace packages.

**T6. E2E hardening + distribution.**
CI job running all template e2e with caching; `npx github:antlab/antlab-create` verified from a clean machine/container; README of the tool itself.
DoD: fresh-container run generates ts-cli project successfully via npx.

**T7. Acceptance in the wild.**
Start DocFlow repo using `py-service` + `ts-fullstack` web part; record friction points; fix top issues in templates.
DoD: DocFlow T1 completed on scaffolder output without manual config fixes; friction log in `docs/decisions.md`.

---

## Session prompt template
> Read CLAUDE.md and docs/PLAN.md. Implement task T<N> only. Contracts are verbatim — ask before deviating. Finish with tests green and a short summary.
