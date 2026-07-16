import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  server: {
    fs: {
      // Allow importing shaders from packages/gl-pipeline (outside this
      // app's root) — apps/web is a spike harness only, real apps will
      // consume gl-pipeline as a proper workspace package once the pnpm
      // workspace is set up in a later phase.
      allow: [resolve(__dirname, ".."), resolve(__dirname, "../..")],
    },
  },
});
