# CLAUDE.md — antlab-create (Project Scaffolder)

## What this project is
Personal CLI that generates project skeletons matching my engineering standards, so every new project starts with lint/test/CI/LLM-layer working out of the box. Spec: `docs/TZ.md`. Plan: `docs/PLAN.md` — one task per session.

## Stack
- Node 22, TypeScript strict, commander (CLI), prompts (interactive), tsup (build)
- Tests: vitest; e2e tests generate real projects into tmp dirs and run their lint/test
- Distribution: `npx github:antlab/antlab-create` (no npm publish for now)

## Commands
- Dev run: `pnpm dev -- my-app`
- Build: `pnpm build` | Tests: `pnpm test` | E2E: `pnpm test:e2e` (slow, installs deps)
- Lint: `pnpm lint` | Typecheck: `pnpm typecheck`

## Hard rules
1. Templates are plain directories under `templates/<name>/` copied file-by-file. Placeholder substitution is a simple `{{var}}` replace over an allowlist of text extensions. NO template engines (handlebars/ejs), no logic in templates.
2. Files that must not be substituted (lockfiles, binaries) are copied verbatim; the substitution allowlist lives in `src/config.ts`.
3. Template content is the product. Any change to shared conventions (lint config, llm/ module, CI) is made in templates first, and e2e tests prove the generated project still passes its own lint+test.
4. The generator itself makes NO network calls except `git init` + first commit locally. Dependency installation is a post-generation step the user runs (printed as next steps), except in e2e tests.
5. The `llm/` module shipped inside `ts-fullstack` and `py-service` templates must match the DocFlow contract style: metered client wrapper, structured-output helper with single retry, `/prompts` directory, `.env.example` with `ANTHROPIC_API_KEY`.
6. Never overwrite an existing non-empty directory. Fail loudly.
7. Keep the CLI dependency footprint minimal; justify any new dependency in the commit body.

## Structure
```
src/
  cli.ts            # commander entry
  generate.ts       # copy + substitute + git init
  config.ts         # templates registry, substitution allowlist
templates/
  ts-fullstack/     # React+Vite+TS+Tailwind web/, Fastify service/, shared/, pnpm ws
  py-service/       # FastAPI + Pydantic v2 + pytest + ruff + mypy + Dockerfile
  ts-cli/           # commander + tsup CLI skeleton
tests/
  e2e/              # generate each template, install, run lint+test inside it
```

## Testing conventions
- Unit: substitution correctness, dir-safety, placeholder coverage (no `{{` left in output).
- E2E (CI job, cached pnpm/uv): each template → generate → install → its own `lint` and `test` must pass. This is the release gate.
