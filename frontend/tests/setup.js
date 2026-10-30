// Executado pelo Vitest antes de cada arquivo de teste (setupFiles no vite.config.js).
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Desmonta os componentes renderizados entre um teste e outro.
afterEach(() => {
  cleanup();
});
