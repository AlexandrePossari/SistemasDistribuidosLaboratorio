import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import CarsPage from "../../src/pages/CarsPage.jsx";

// Testa formulario, filtro e lista trabalhando juntos sobre o estado da pagina.

const carrosIniciais = [
  { id: 1, marca: "Toyota", modelo: "Corolla", ano: 2024, cor: "Prata", preco: 150000 },
  { id: 2, marca: "Honda", modelo: "Civic", ano: 2022, cor: "Preto", preco: 135000 },
];

async function preencherFormulario(user, { marca, modelo, ano, cor, preco }) {
  await user.type(screen.getByLabelText("Marca"), marca);
  await user.type(screen.getByLabelText("Modelo"), modelo);
  await user.type(screen.getByLabelText("Ano"), ano);
  await user.type(screen.getByLabelText("Cor"), cor);
  await user.type(screen.getByLabelText("Preço (R$)"), preco);
}

function itensDaLista() {
  return within(screen.getByRole("list", { name: "Carros cadastrados" })).getAllByRole("listitem");
}

describe("CarsPage", () => {
  it("cadastra um carro valido, adiciona a lista e limpa o formulario", async () => {
    const user = userEvent.setup();
    render(<CarsPage carrosIniciais={carrosIniciais} />);

    await preencherFormulario(user, {
      marca: "Volkswagen",
      modelo: "Golf",
      ano: "2021",
      cor: "Azul",
      preco: "120000",
    });
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(itensDaLista()).toHaveLength(3);
    expect(screen.getByText("Volkswagen Golf")).toBeInTheDocument();
    expect(screen.getByTestId("contador-carros")).toHaveTextContent("3 de 3");
    expect(screen.getByLabelText("Marca")).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mostra os erros de validacao e nao cadastra um carro invalido", async () => {
    const user = userEvent.setup();
    render(<CarsPage carrosIniciais={carrosIniciais} />);

    await preencherFormulario(user, {
      marca: "Fiat",
      modelo: "Uno",
      ano: "1800",
      cor: "Branco",
      preco: "0",
    });
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    const alertas = screen.getAllByRole("alert").map((alerta) => alerta.textContent);
    expect(alertas).toEqual([
      "Ano deve estar entre 1886 e 2100.",
      "Preço deve ser maior que zero.",
    ]);
    expect(screen.getByLabelText("Ano")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Fiat Uno")).not.toBeInTheDocument();
    expect(itensDaLista()).toHaveLength(2);
  });

  it("filtra a lista pela marca", async () => {
    const user = userEvent.setup();
    render(<CarsPage carrosIniciais={carrosIniciais} />);

    await user.type(screen.getByLabelText("Filtrar por marca"), "hon");

    expect(itensDaLista()).toHaveLength(1);
    expect(screen.getByText("Honda Civic")).toBeInTheDocument();
    expect(screen.getByTestId("contador-carros")).toHaveTextContent("1 de 2");

    await user.clear(screen.getByLabelText("Filtrar por marca"));
    await user.type(screen.getByLabelText("Filtrar por marca"), "fiat");

    expect(screen.getByText("Nenhum carro encontrado.")).toBeInTheDocument();
  });

  it("remove um carro da lista", async () => {
    const user = userEvent.setup();
    render(<CarsPage carrosIniciais={carrosIniciais} />);

    await user.click(screen.getByRole("button", { name: "Remover Toyota Corolla" }));

    expect(itensDaLista()).toHaveLength(1);
    expect(screen.queryByText("Toyota Corolla")).not.toBeInTheDocument();
    expect(screen.getByTestId("contador-carros")).toHaveTextContent("1 de 1");
  });
});
