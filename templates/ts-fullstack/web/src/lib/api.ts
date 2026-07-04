import { healthResponseSchema, type HealthResponse } from "@{{project_name}}/shared";

// The Vite dev server proxies /health to the service (see vite.config.ts).
export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch("/health");
  if (!response.ok) {
    throw new Error(`health request failed with status ${response.status}`);
  }
  return parseHealth(await response.json());
}

// Split out of fetchHealth so response validation is unit-testable.
export function parseHealth(data: unknown): HealthResponse {
  return healthResponseSchema.parse(data);
}
