# {{project_name}}

TODO: one-line description of {{project_name}}.

## Problem

TODO: what pain does this product remove, for whom, and why now.

## Solution

TODO: what {{project_name}} does about it, in a few sentences.

## Architecture

pnpm workspace with three packages; `shared/` is the single source of truth
for the wire contract between the web app and the service.

```
shared/     # Zod schemas imported by both sides (source-only package)
service/    # Fastify API + llm/ layer (metered Anthropic wrapper, prompts/)
web/        # React 18 + Vite + Tailwind frontend
```

The web dev server proxies `/health` to the service (see `web/vite.config.ts`),
so `pnpm dev` runs both sides against each other out of the box.

## Setup

Requires Node >= 22.18 and pnpm.

```
pnpm install
cp service/.env.example service/.env   # add ANTHROPIC_API_KEY for the llm layer
pnpm dev        # service on :3000 + web on the Vite port, in parallel
pnpm test       # vitest in every package
pnpm lint       # eslint + prettier over the whole workspace
pnpm typecheck  # tsc --noEmit in every package
pnpm build      # production build (web)
```

Per-package runs: `pnpm --filter ./service test`, `pnpm --filter ./web dev`, etc.
LLM smoke test against the real API: `pnpm --filter ./service test:llm-smoke`.

## Design decisions

TODO: record non-obvious choices and the trade-offs behind them.

- `shared/` ships TypeScript source directly (`exports` points at `src/`); web
  and service consume it without a build step. The service runs it via Node's
  native type stripping, Vite/vitest transform it on the fly.
