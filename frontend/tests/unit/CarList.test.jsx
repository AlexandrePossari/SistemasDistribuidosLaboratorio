import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CarList from "../../src/components/CarList.jsx";

const carros = [
  { id: 1, marca: "Toyota", modelo: "Corolla", ano: 2024, cor: "Prata", preco: 150000 },
  { id: 2, marca: "Honda", modelo: "Civic", ano: 2022, cor: "Preto", preco: 135000 },
];

function renderizar(props = {}) {
  const handlers = {
    onEdit: vi.fn(),
    onUpdatePrice: vi.fn().mockResolvedValue(true),
    onRemove: vi.fn(),
    ...props,
  };
  render(<CarList carros={carros} {...handlers} />);
  return handlers;
}

describe("CarList", () => {
  it("mostra uma mensagem quando nao ha carros", () => {
    render(<CarList carros={[]} onEdit={vi.fn()} onUpdatePrice={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Nenhum carro encontrado.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renderiza um item por carro com os dados formatados", () => {
    renderizar();

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Toyota Corolla")).toBeInTheDocument();
    expect(screen.getByText(/2024 · Prata · R\$\s150\.000,00/)).toBeInTheDocument();
  });

  it("chama onEdit e onRemove com o id do carro clicado", async () => {
    const user = userEvent.setup();
    const { onEdit, onRemove } = renderizar();

    await user.click(screen.getByRole("button", { name: "Editar Toyota Corolla" }));
    await user.click(screen.getByRole("button", { name: "Remover Honda Civic" }));

    expect(onEdit).toHaveBeenCalledWith(1);
    expect(onRemove).toHaveBeenCalledWith(2);
  });
});

describe("CarItem: alterar preco", () => {
  it("envia o novo preco como numero e fecha o formulario", async () => {
    const user = userEvent.setup();
    const { onUpdatePrice } = renderizar();

    await user.click(screen.getByRole("button", { name: "Alterar preço de Honda Civic" }));
    const campo = screen.getByLabelText("Novo preço (R$)");
    expect(campo).toHaveValue(135000);

    await user.clear(campo);
    await user.type(campo, "129900.5");
    await user.click(screen.getByRole("button", { name: "Salvar preço" }));

    expect(onUpdatePrice).toHaveBeenCalledWith(2, 129900.5);
    expect(screen.queryByLabelText("Novo preço (R$)")).not.toBeInTheDocument();
  });

  it("valida o preco antes de chamar a API", async () => {
    const user = userEvent.setup();
    const { onUpdatePrice } = renderizar();

    await user.click(screen.getByRole("button", { name: "Alterar preço de Toyota Corolla" }));
    await user.clear(screen.getByLabelText("Novo preço (R$)"));
    await user.type(screen.getByLabelText("Novo preço (R$)"), "0");
    await user.click(screen.getByRole("button", { name: "Salvar preço" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Preço deve ser maior que zero.");
    expect(onUpdatePrice).not.toHaveBeenCalled();
  });

  it("mantem o formulario aberto quando a API recusa", async () => {
    const user = userEvent.setup();
    renderizar({ onUpdatePrice: vi.fn().mockResolvedValue(false) });

    await user.click(screen.getByRole("button", { name: "Alterar preço de Toyota Corolla" }));
    await user.click(screen.getByRole("button", { name: "Salvar preço" }));

    expect(screen.getByLabelText("Novo preço (R$)")).toBeInTheDocument();
  });
});
