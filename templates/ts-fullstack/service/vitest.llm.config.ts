import { defineConfig } from "vitest/config";

// Real-API smoke run: `pnpm test:llm-smoke` (loads service/.env via
// node --env-file-if-exists so ANTHROPIC_API_KEY is available).
export default defineConfig({
  test: {
    include: ["tests/**/*.smoke.test.ts"],
    testTimeout: 120_000,
  },
});
