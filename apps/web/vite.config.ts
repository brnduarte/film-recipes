import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// `base` is the public path the app is served under. Defaults to "/" (domain
// root / custom domain); the GitHub Pages workflow sets VITE_BASE to
// "/<repo>/" so a project-pages deploy resolves its assets correctly.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react(), tailwindcss()],
});
