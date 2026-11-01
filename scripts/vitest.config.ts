import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../apps/web/src"),
    },
  },
  test: {
    environment: "node",
    include: [
      "scripts/tests/**/*.test.ts",
      "scripts/security/**/*.test.ts",
    ],
  },
});
