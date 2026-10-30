import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CarList from "../../src/components/CarList.jsx";

const carros = [
  { id: 1, marca: "Toyota", modelo: "Corolla", ano: 2024, cor: "Prata", preco: 150000 },
  { id: 2, marca: "Honda", modelo: "Civic", ano: 2022, cor: "Preto", preco: 135000 },
];

describe("CarList", () => {
  it("mostra uma mensagem quando nao ha carros", () => {
    render(<CarList carros={[]} onRemove={vi.fn()} />);

    expect(screen.getByText("Nenhum carro encontrado.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renderiza um item por carro com os dados formatados", () => {
    render(<CarList carros={carros} onRemove={vi.fn()} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Toyota Corolla")).toBeInTheDocument();
    expect(screen.getByText(/2024 · Prata · R\$\s150\.000,00/)).toBeInTheDocument();
  });

  it("chama onRemove com o id do carro clicado", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<CarList carros={carros} onRemove={onRemove} />);

    await user.click(screen.getByRole("button", { name: "Remover Honda Civic" }));

    expect(onRemove).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledWith(2);
  });
});
