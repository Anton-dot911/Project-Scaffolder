# {{project_name}}

TODO: one-line description of {{project_name}}.

## Problem

TODO: what pain does this tool remove, for whom, and why now.

## Solution

TODO: what {{project_name}} does about it, in a few sentences.

```
{{project_name}} [name]
```

## Architecture

TODO: main moving parts and how data flows between them.

```
src/
  cli.ts      # commander entry point
  greet.ts    # example module; replace with real functionality
tests/        # vitest tests
```

## Setup

Requires Node >= 22.18 and pnpm.

```
pnpm install
pnpm dev        # run the CLI from source
pnpm test       # vitest
pnpm lint       # eslint + prettier
pnpm typecheck  # tsc --noEmit
pnpm build      # bundle to dist/ with tsup
```

## Design decisions

TODO: record non-obvious choices and the trade-offs behind them.
