# antlab-create

Personal CLI that generates project skeletons matching my engineering
standards, so every new project starts with lint, tests, CI and the LLM layer
working out of the box. One command replaces the same 2–4 hours of setup
routine at the start of every project.

Spec: [docs/TZ.md](docs/TZ.md) · Plan: [docs/PLAN.md](docs/PLAN.md)

## Usage

```sh
npx github:Anton-dot911/Project-Scaffolder my-app
```

Interactive by default: select a template, confirm the target directory,
get printed next steps. Flags for non-interactive use:

```sh
npx github:Anton-dot911/Project-Scaffolder my-app --template ts-cli --no-git
```

| Option              | Effect                             |
| ------------------- | ---------------------------------- |
| `--template <name>` | skip interactive selection         |
| `--no-git`          | skip `git init` + first commit     |
| `--no-interactive`  | fail instead of prompting (CI use) |

Project names must match `^[a-z][a-z0-9-]{1,40}$`. The generator never
overwrites an existing non-empty directory (exit code 2); an unknown
template is exit code 3.

## Templates

| Template       | Contents                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| `ts-fullstack` | pnpm workspace: React + Vite + TS + Tailwind `web/`, Fastify `service/` with `llm/` client, shared Zod schemas |
| `py-service`   | FastAPI + Pydantic v2 + pytest + ruff + mypy + Dockerfile, `app/llm/` client                                   |
| `ts-cli`       | Node CLI with commander, tsup build, vitest                                                                    |

Every template ships `.env.example`, `.gitignore`, MIT LICENSE, README and
CLAUDE.md skeletons, lint + format config, a passing example test, and a
GitHub Actions CI workflow (lint + typecheck + test on push). The `llm/`
module in `ts-fullstack` and `py-service` is a metered Anthropic client
wrapper with a structured-output helper (single retry with error feedback)
and a `/prompts` directory.

Generation is offline by design: the only side effect beyond copying files
is a local `git init` + first commit. Installing dependencies is a printed
next step, not something the generator does.

## Development

```sh
pnpm install
pnpm dev -- my-app --template ts-cli --no-git   # run from source
pnpm test                                        # unit tests
pnpm test:e2e                                    # slow: generates real projects, installs deps
pnpm lint && pnpm typecheck
pnpm build                                       # tsup → dist/
```

Templates are plain directories under `templates/<name>/` copied
file-by-file with `{{var}}` substitution over an allowlist of text
extensions (`src/config.ts`) — no template engines. Because npm strips
`.gitignore` files when packing, templates store them as `_gitignore` and
the generator renames them on copy.

The e2e suite (`tests/e2e/`) is the release gate: each template is
generated into a tmp dir, its dependencies installed, and the generated
project's own lint/typecheck/test must pass. CI runs unit checks plus the
full e2e matrix on every push.
