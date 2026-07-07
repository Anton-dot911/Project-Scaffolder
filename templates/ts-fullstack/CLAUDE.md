# CLAUDE.md — {{project_name}}

## What this project is

TODO: one paragraph on what {{project_name}} does and for whom.

## Stack

- pnpm workspace: `shared/` (Zod schemas), `service/` (Fastify), `web/` (React 18 + Vite + Tailwind)
- Node 22, TypeScript strict; service runs TS directly via Node type stripping
- Tests: vitest per package (service llm smoke test hits the real API, excluded by default)
- Lint/format: ESLint + Prettier at the workspace root
- LLM layer: `service/src/llm/` — metered Anthropic wrapper with structured outputs, prompts in `service/prompts/`

## Commands

- Dev (web + service in parallel): `pnpm dev`
- Tests: `pnpm test` | LLM smoke: `pnpm --filter ./service test:llm-smoke` (needs `service/.env`)
- Lint: `pnpm lint` | Typecheck: `pnpm typecheck`
- One package: `pnpm --filter ./<pkg> <script>`

## Structure

```
shared/
  src/index.ts    # wire-contract schemas; import from both web and service
service/
  src/app.ts      # Fastify app factory (/health)
  src/index.ts    # listen entry point
  src/llm/        # client.ts (createLlm/structured); calls recorded to Meter (Supabase llm_calls)
  prompts/        # versioned prompt files (<name>.v<N>.md)
web/
  src/            # React app (App.tsx, lib/api.ts fetches via Vite proxy)
```

## Hard rules

TODO: fill in per project.

1. Schemas shared between web and service live in `shared/` only — never
   duplicate a wire type on one side.
