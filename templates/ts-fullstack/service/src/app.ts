import { healthResponseSchema } from "@{{project_name}}/shared";
import Fastify, { type FastifyInstance } from "fastify";

const SERVICE_NAME = "{{project_name}}";

// App factory kept separate from the listen call in index.ts so tests can
// exercise routes with app.inject() without opening a port.
export function buildApp(options: { logger?: boolean } = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? true });

  app.get("/health", () => healthResponseSchema.parse({ status: "ok", service: SERVICE_NAME }));

  return app;
}
