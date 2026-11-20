import { defineConfig, devices } from "@playwright/test";

const BASE_URL = `http://localhost:${process.env.FRONTEND_PORT ?? 5173}`;
const API_URL = (process.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");
const isCI = Boolean(process.env.CI);

// Os testes E2E usam a aplicacao real: navegador -> frontend (Vite) -> API -> PostgreSQL.
// Localmente, com a stack no ar (make up), a API e o frontend do docker compose sao
// reaproveitados. No CI, o proprio Playwright sobe a API (Poetry) e o Vite.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "poetry run uvicorn app.main:app --host 127.0.0.1 --port 8000",
      cwd: "../backend",
      url: `${API_URL}/health`,
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
    {
      command: "npm run dev",
      url: BASE_URL,
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
  ],
});
