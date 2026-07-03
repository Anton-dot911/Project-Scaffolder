FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

# Install dependencies first so they cache independently of source changes.
# Once uv.lock is committed after the first install, add --frozen to both syncs.
COPY pyproject.toml ./
RUN uv sync --no-dev --no-install-project

COPY . .
RUN uv sync --no-dev

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["fastapi", "run", "app/main.py", "--port", "8000"]
