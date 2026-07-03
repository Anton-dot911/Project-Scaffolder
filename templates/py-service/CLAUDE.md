# CLAUDE.md — {{project_name}}

## What this project is

TODO: one paragraph on what {{project_name}} does and for whom.

## Stack

- Python 3.12+, FastAPI, Pydantic v2, uv (package manager)
- Tests: pytest (tests marked `llm` call the real Anthropic API and are excluded by default)
- Lint/format: ruff | Typecheck: mypy (strict)
- LLM layer: `app/llm/` — metered Anthropic wrapper with structured outputs, prompts in `prompts/`

## Commands

- Dev run: `uv run fastapi dev app/main.py`
- Tests: `uv run pytest` | LLM smoke: `uv run --env-file .env pytest -m llm`
- Lint: `uv run ruff check . && uv run ruff format --check .`
- Typecheck: `uv run mypy`

## Structure

```
app/
  main.py       # FastAPI entry point (/health)
  llm/          # client.py (create_llm/structured), meter.py (no-op Meter stub)
prompts/        # versioned prompt files (<name>.v<N>.md)
tests/          # pytest
```

## Hard rules

TODO: fill in per project.
