// Enforces the plan's privacy guarantee (section 7) at lint time, not just
// via the CSP and the Playwright no-network E2E test: no code anywhere in
// the app is allowed to reference `fetch` or `XMLHttpRequest`, since this
// app never sends data anywhere. Scoped to every TS/TSX/JS/MJS source file
// under apps/ and packages/ — the whole point is that *nothing* in the app
// should be able to make a network call, not just the processing/UI
// packages named in the plan.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

const noNetworkGlobals = [
  { name: "fetch", message: "Network calls are banned app-wide — this app never sends data anywhere (see plan section 7)." },
  { name: "XMLHttpRequest", message: "Network calls are banned app-wide — this app never sends data anywhere (see plan section 7)." },
];

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/target/**",
      "**/*.wasm",
      "packages/*/src/wasm/**",
      "packages/*/wasm/**",
      "third_party/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/**/*.{ts,tsx,js,mjs}", "packages/**/*.{ts,tsx,js,mjs}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      "no-restricted-globals": ["error", ...noNetworkGlobals],
    },
  },
  {
    // Node-run scripts (parity/schema-parity tests, example dumps) — not
    // browser code, so they use console/process, not fetch/XHR.
    files: ["**/test/**/*.{js,mjs,ts}", "**/*.test.{ts,mjs}"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
