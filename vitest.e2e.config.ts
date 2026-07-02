import { defineConfig } from "vitest/config";

// E2E tests generate real projects into tmp dirs and install their
// dependencies, so they get their own config and a generous timeout.
// passWithNoTests keeps the script green until T3 adds the first e2e test.
export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    passWithNoTests: true,
    testTimeout: 600_000,
  },
});
