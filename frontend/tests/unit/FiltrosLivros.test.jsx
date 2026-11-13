import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FiltrosLivros from "../../src/components/FiltrosLivros.jsx";

function renderizar(status = "") {
  const props = { onStatusChange: vi.fn(), onBuscar: vi.fn() };
  render(<FiltrosLivros status={status} {...props} />);
  return props;
}

describe("FiltrosLivros", () => {
  it("marca a aba do status ativo", () => {
    renderizar("lendo");

    expect(screen.getByRole("button", { name: "Lendo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "false");
  });

  it("troca o status pelas abas", async () => {
    const user = userEvent.setup();
    const { onStatusChange } = renderizar();

    await user.click(screen.getByRole("button", { name: "Lido" }));
    await user.click(screen.getByRole("button", { name: "Todos" }));

    expect(onStatusChange).toHaveBeenNthCalledWith(1, "lido");
    expect(onStatusChange).toHaveBeenNthCalledWith(2, "");
  });

  it("busca o texto sem espacos nas pontas e limpa a busca", async () => {
    const user = userEvent.setup();
    const { onBuscar } = renderizar();

    await user.type(screen.getByLabelText("Buscar por título ou autor"), "  tolkien ");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await user.click(screen.getByRole("button", { name: "Limpar" }));

    expect(onBuscar).toHaveBeenNthCalledWith(1, "tolkien");
    expect(onBuscar).toHaveBeenNthCalledWith(2, "");
    expect(screen.getByLabelText("Buscar por título ou autor")).toHaveValue("");
  });
});
