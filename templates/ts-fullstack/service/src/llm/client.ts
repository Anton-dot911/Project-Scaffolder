// Metered Anthropic client wrapper with structured (tool-use) outputs.
//
// Mirror of the py-service contract in the antlab shared conventions:
// createLlm({ project, component }) returns an Llm whose structured() forces a
// tool call shaped by a Zod schema, validates the result, and retries once
// with error feedback.

import { readFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { meteredClient } from "meter-ts";
import { z } from "zod";

// Fallback chain mirrors the contract: explicit arg > LLM_MODEL env > default.
const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_OUTPUT_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 60_000;
// Sleep-then-retry on 429 (rate limited) / 529 (overloaded); other errors throw.
const BACKOFF_MS = [1_000, 4_000];
const TOOL_NAME = "structured_output";

// promptFile paths ("prompts/<name>.v<N>.md") resolve against the service
// package root, which is two levels up from src/llm/.
const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// The model did not produce output matching the schema.
export class LlmError extends Error {}

export interface StructuredArgs<T> {
  promptFile: string; // prompts/<name>.v<N>.md
  schema: z.ZodType<T>;
  input: unknown;
  model?: string; // default from env LLM_MODEL, fallback DEFAULT_MODEL
  temperature?: number; // default 0
}

export interface Llm {
  // tool-use + validate + 1 retry with error feedback
  structured<T>(args: StructuredArgs<T>): Promise<T>;
}

export function createLlm(opts: { project: string; component: string }): Llm {
  // SDK-internal retries are disabled so the explicit backoff below is the
  // single retry mechanism. Reads ANTHROPIC_API_KEY from the env. meteredClient
  // wraps the SDK so every messages.create is recorded to Meter (Supabase
  // llm_calls) with cost/latency/tokens; it only observes the response.
  const client = meteredClient(new Anthropic({ timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 }), {
    project: opts.project,
    component: opts.component,
  });

  async function callWithBackoff(
    model: string,
    temperature: number,
    system: string,
    messages: Anthropic.MessageParam[],
    tool: Anthropic.Tool,
  ): Promise<Anthropic.Message> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        // Recorded to Meter automatically by the meteredClient wrapper.
        return await client.messages.create({
          model,
          max_tokens: MAX_OUTPUT_TOKENS,
          temperature,
          system,
          messages,
          tools: [tool],
          tool_choice: { type: "tool", name: TOOL_NAME },
        });
      } catch (error) {
        const retryable =
          error instanceof Anthropic.APIError &&
          (error.status === 429 || error.status === 529) &&
          attempt < BACKOFF_MS.length;
        if (!retryable) throw error;
        await sleep(BACKOFF_MS[attempt]);
      }
    }
  }

  return {
    async structured<T>(args: StructuredArgs<T>): Promise<T> {
      const model = args.model ?? process.env.LLM_MODEL ?? DEFAULT_MODEL;
      const temperature = args.temperature ?? 0;
      const system = readFileSync(path.join(PACKAGE_ROOT, args.promptFile), "utf8");
      const userContent = typeof args.input === "string" ? args.input : JSON.stringify(args.input);

      const tool: Anthropic.Tool = {
        name: TOOL_NAME,
        description: "Report the result in the required structure.",
        input_schema: z.toJSONSchema(args.schema) as Anthropic.Tool.InputSchema,
      };
      let messages: Anthropic.MessageParam[] = [{ role: "user", content: userContent }];

      let lastError: z.ZodError | undefined;
      for (let round = 0; round < 2; round += 1) {
        // first attempt + one retry with error feedback
        const response = await callWithBackoff(model, temperature, system, messages, tool);
        const block = response.content.find((b) => b.type === "tool_use");
        if (block === undefined) {
          throw new LlmError(
            `model returned no ${TOOL_NAME} tool call (stop_reason=${response.stop_reason})`,
          );
        }
        const parsed = args.schema.safeParse(block.input);
        if (parsed.success) {
          return parsed.data;
        }
        lastError = parsed.error;
        messages = [
          ...messages,
          {
            role: "assistant",
            content: [{ type: "tool_use", id: block.id, name: block.name, input: block.input }],
          },
          {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: block.id,
                content:
                  "The output failed schema validation:\n" +
                  `${z.prettifyError(lastError)}\n` +
                  `Call ${TOOL_NAME} again with corrected values.`,
                is_error: true,
              },
            ],
          },
        ];
      }
      throw new LlmError("output failed schema validation after one retry", { cause: lastError });
    },
  };
}
