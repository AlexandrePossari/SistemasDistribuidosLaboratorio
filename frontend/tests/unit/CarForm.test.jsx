import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CarForm from "../../src/components/CarForm.jsx";

const carro = { id: 4, marca: "Fiat", modelo: "Uno", ano: 2010, cor: "Vermelho", preco: 25000 };

async function preencher(user, valores) {
  for (const [rotulo, valor] of Object.entries(valores)) {
    await user.clear(screen.getByLabelText(rotulo));
    await user.type(screen.getByLabelText(rotulo), valor);
  }
}

describe("CarForm: cadastro", () => {
  it("envia os dados convertidos e limpa o formulario quando a API aceita", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<CarForm onSubmit={onSubmit} />);

    await preencher(user, {
      Marca: "Fiat",
      Modelo: "Uno",
      Ano: "2010",
      Cor: "Vermelho",
      "Preço (R$)": "25000",
    });
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(onSubmit).toHaveBeenCalledWith({
      marca: "Fiat",
      modelo: "Uno",
      ano: 2010,
      cor: "Vermelho",
      preco: 25000,
    });
    expect(screen.getByLabelText("Marca")).toHaveValue("");
  });

  it("mantem os dados quando a API recusa", async () => {
    const user = userEvent.setup();
    render(<CarForm onSubmit={vi.fn().mockResolvedValue(false)} />);

    await preencher(user, {
      Marca: "Fiat",
      Modelo: "Uno",
      Ano: "2010",
      Cor: "Vermelho",
      "Preço (R$)": "25000",
    });
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(screen.getByLabelText("Marca")).toHaveValue("Fiat");
  });

  it("nao chama a API com dados invalidos", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CarForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(screen.getAllByRole("alert")).toHaveLength(5);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("desabilita o botao enquanto envia", () => {
    render(<CarForm onSubmit={vi.fn()} enviando />);

    expect(screen.getByRole("button", { name: "Salvando..." })).toBeDisabled();
  });
});

describe("CarForm: edicao", () => {
  it("preenche os campos com o carro e envia as alteracoes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<CarForm carro={carro} onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.getByRole("form", { name: "Editar Fiat Uno" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ano")).toHaveValue(2010);

    await preencher(user, { Cor: "Azul" });
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(onSubmit).toHaveBeenCalledWith({
      marca: "Fiat",
      modelo: "Uno",
      ano: 2010,
      cor: "Azul",
      preco: 25000,
    });
  });

  it("chama onCancel ao cancelar", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<CarForm carro={carro} onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
