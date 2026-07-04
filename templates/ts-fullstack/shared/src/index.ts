import { z } from "zod";

// Wire contract between web/ and service/: define every schema that crosses
// the HTTP boundary here and import it from both sides, so the contract has a
// single source of truth. This package ships TypeScript source directly (no
// build step); keep it free of dependencies other than zod.

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
