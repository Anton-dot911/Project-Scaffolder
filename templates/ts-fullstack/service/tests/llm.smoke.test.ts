// Real-API smoke test for src/llm, excluded from the default vitest config
// (see vitest.config.ts). Run with a real key in service/.env:
//   pnpm test:llm-smoke

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createLlm } from "../src/llm/client.ts";

const echoSchema = z.object({ message: z.string() });

describe.skipIf(process.env.ANTHROPIC_API_KEY === undefined)("llm structured smoke", () => {
  it("echoes through the real API", async () => {
    const llm = createLlm({
      project: "{{project_name}}",
      component: "smoke-test",
    });
    const result = await llm.structured({
      promptFile: "prompts/echo.v1.md",
      schema: echoSchema,
      input: { message: "ping" },
    });
    expect(result.message).toContain("ping");
  });
});
