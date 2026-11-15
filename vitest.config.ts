import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { tabster: fileURLToPath(new URL("./node_modules/tabster/dist/esm/index.js", import.meta.url)) } },
  test: {
    environment: "node", testTimeout: 20_000,
    server: { deps: { inline: true } },
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  },
});
