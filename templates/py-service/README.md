# {{project_name}}

TODO: one-line description of {{project_name}}.

## Problem

TODO: what pain does this service remove, for whom, and why now.

## Solution

TODO: what {{project_name}} does about it, in a few sentences.

## Architecture

TODO: main moving parts and how data flows between them.

```
app/
  main.py       # FastAPI entry point (/health)
  llm/          # Anthropic client wrapper: structured outputs, retry, metering
prompts/        # versioned prompt files (<name>.v<N>.md)
tests/          # pytest; llm-marked tests hit the real API and are opt-in
```

## Setup

Requires Python >= 3.12 and [uv](https://docs.astral.sh/uv/).

```
uv sync                              # install dependencies (incl. dev tools)
uv run fastapi dev app/main.py       # run the API with reload
uv run pytest                        # tests (llm smoke tests excluded)
uv run ruff check . && uv run ruff format --check .   # lint + format
uv run mypy                          # typecheck (strict)
```

LLM smoke test (real API call, needs `ANTHROPIC_API_KEY` in `.env`):

```
uv run --env-file .env pytest -m llm
```

Docker:

```
docker build -t {{project_name}} .
docker run --rm -p 8000:8000 {{project_name}}
```

## Design decisions

TODO: record non-obvious choices and the trade-offs behind them.
