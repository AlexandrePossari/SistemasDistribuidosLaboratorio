import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // No container o src/ e montado como volume e, no Windows e no macOS, o Vite nao
    // recebe os eventos de alteracao de arquivo: o compose liga VITE_WATCH_POLLING.
    watch: process.env.VITE_WATCH_POLLING === "true" ? { usePolling: true, interval: 300 } : {},
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    // Os testes E2E (tests/e2e/*.spec.js) sao executados pelo Playwright, nao pelo Vitest.
    include: ["tests/unit/**/*.test.{js,jsx}", "tests/integration/**/*.test.{js,jsx}"],
  },
});
