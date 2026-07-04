import { defineConfig } from "vitest/config";

// The llm smoke test calls the real Anthropic API, so it is excluded here and
// runs only via `pnpm test:llm-smoke` (vitest.llm.config.ts).
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/**/*.smoke.test.ts"],
  },
});
