import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Route service calls through the dev server so the web app can use
    // same-origin paths; keep in sync with the routes in service/src/app.ts.
    proxy: {
      "/health": "http://localhost:3000",
    },
  },
});
