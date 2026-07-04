import { useEffect, useState } from "react";
import type { HealthResponse } from "@{{project_name}}/shared";
import { fetchHealth } from "./lib/api.ts";

const PROJECT_NAME = "{{project_name}}";

// Example page; replace with real functionality. It exists to prove the full
// loop: web → Vite proxy → service → shared schema validation → render.
export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
      });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-900">{PROJECT_NAME}</h1>
      <p className="text-slate-600">
        service status:{" "}
        {health !== null ? (
          <span className="font-mono text-green-700">{health.status}</span>
        ) : error !== null ? (
          <span className="font-mono text-red-700">{error}</span>
        ) : (
          <span className="font-mono text-slate-400">loading…</span>
        )}
      </p>
    </main>
  );
}
