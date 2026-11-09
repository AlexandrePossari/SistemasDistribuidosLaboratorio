import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CarsPage from "../../src/pages/CarsPage.jsx";
import { ApiError, MENSAGEM_SEM_CONEXAO } from "../../src/services/api.js";
import {
  atualizarCarro,
  criarCarro,
  listarCarros,
  obterCarro,
  removerCarro,
  substituirCarro,
} from "../../src/services/cars.js";

// Testa a pagina inteira (formulario + filtro + lista) conversando com o servico de
// carros. O servico e mockado: o foco e a integracao entre os componentes e as
// chamadas a API, sem depender do backend nem do banco.
vi.mock("../../src/services/cars.js", () => ({
  listarCarros: vi.fn(),
  obterCarro: vi.fn(),
  criarCarro: vi.fn(),
  substituirCarro: vi.fn(),
  atualizarCarro: vi.fn(),
  removerCarro: vi.fn(),
}));

const corolla = {
  id: 1,
  marca: "Toyota",
  modelo: "Corolla",
  ano: 2024,
  cor: "Prata",
  preco: 150000,
};
const civic = { id: 2, marca: "Honda", modelo: "Civic", ano: 2022, cor: "Preto", preco: 135000 };
const golf = { id: 3, marca: "Volkswagen", modelo: "Golf", ano: 2021, cor: "Azul", preco: 120000 };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listarCarros).mockResolvedValue([corolla, civic]);
});

async function renderizarPagina() {
  const user = userEvent.setup();
  render(<CarsPage />);
  await screen.findByRole("list", { name: "Carros cadastrados" });
  return user;
}

function itensDaLista() {
  return within(screen.getByRole("list", { name: "Carros cadastrados" })).getAllByRole("listitem");
}

async function preencherFormulario(user, valores) {
  for (const [rotulo, valor] of Object.entries(valores)) {
    await user.clear(screen.getByLabelText(rotulo));
    await user.type(screen.getByLabelText(rotulo), valor);
  }
}

const dadosGolf = {
  Marca: "Volkswagen",
  Modelo: "Golf",
  Ano: "2021",
  Cor: "Azul",
  "Preço (R$)": "120000",
};

describe("CarsPage: listagem", () => {
  it("mostra o carregamento e depois os carros vindos da API", async () => {
    render(<CarsPage />);

    expect(screen.getByText("Carregando carros...")).toBeInTheDocument();
    expect(await screen.findByText("Toyota Corolla")).toBeInTheDocument();
    expect(itensDaLista()).toHaveLength(2);
    expect(screen.getByTestId("contador-carros")).toHaveTextContent("2 carros");
    expect(listarCarros).toHaveBeenCalledWith({ marca: "" });
  });

  it("mostra o erro quando a API esta fora do ar e permite tentar de novo", async () => {
    vi.mocked(listarCarros)
      .mockRejectedValueOnce(new ApiError(MENSAGEM_SEM_CONEXAO, 0))
      .mockResolvedValueOnce([civic]);
    const user = userEvent.setup();
    render(<CarsPage />);

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(
      `Não foi possível carregar os carros: ${MENSAGEM_SEM_CONEXAO}`,
    );

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Honda Civic")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(listarCarros).toHaveBeenCalledTimes(2);
  });

  it("busca pela marca no backend e limpa o filtro", async () => {
    const user = await renderizarPagina();
    vi.mocked(listarCarros).mockResolvedValueOnce([civic]);

    await user.type(screen.getByLabelText("Filtrar por marca"), " honda ");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(listarCarros).toHaveBeenLastCalledWith({ marca: "honda" });
    expect(await screen.findByTestId("contador-carros")).toHaveTextContent("1 carro");

    await user.click(screen.getByRole("button", { name: "Limpar" }));

    expect(listarCarros).toHaveBeenLastCalledWith({ marca: "" });
    expect(screen.getByLabelText("Filtrar por marca")).toHaveValue("");
  });
});

describe("CarsPage: cadastro", () => {
  it("cadastra pela API, avisa o sucesso e recarrega a lista", async () => {
    const user = await renderizarPagina();
    vi.mocked(criarCarro).mockResolvedValue(golf);
    vi.mocked(listarCarros).mockResolvedValue([corolla, civic, golf]);

    await preencherFormulario(user, dadosGolf);
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(criarCarro).toHaveBeenCalledWith({
      marca: "Volkswagen",
      modelo: "Golf",
      ano: 2021,
      cor: "Azul",
      preco: 120000,
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Volkswagen Golf cadastrado.");
    expect(await screen.findByText("Volkswagen Golf")).toBeInTheDocument();
    expect(itensDaLista()).toHaveLength(3);
    expect(screen.getByLabelText("Marca")).toHaveValue("");
  });

  it("mostra o erro da API e mantem os dados no formulario", async () => {
    const user = await renderizarPagina();
    vi.mocked(criarCarro).mockRejectedValue(
      new ApiError("ano: Input should be less than or equal to 2100", 422),
    );

    await preencherFormulario(user, dadosGolf);
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível cadastrar o carro: ano: Input should be less than or equal to 2100",
    );
    expect(screen.getByLabelText("Marca")).toHaveValue("Volkswagen");
    expect(listarCarros).toHaveBeenCalledTimes(1);
  });

  it("nao chama a API quando a validacao do formulario falha", async () => {
    const user = await renderizarPagina();

    await preencherFormulario(user, { ...dadosGolf, Ano: "1800" });
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Ano deve estar entre 1886 e 2100.");
    expect(criarCarro).not.toHaveBeenCalled();
  });
});

describe("CarsPage: edicao", () => {
  it("busca o carro na API, preenche o formulario e salva com PUT", async () => {
    const user = await renderizarPagina();
    vi.mocked(obterCarro).mockResolvedValue(corolla);
    vi.mocked(substituirCarro).mockResolvedValue({ ...corolla, cor: "Branco" });

    await user.click(screen.getByRole("button", { name: "Editar Toyota Corolla" }));

    const formulario = await screen.findByRole("form", { name: "Editar Toyota Corolla" });
    expect(obterCarro).toHaveBeenCalledWith(1);
    expect(within(formulario).getByLabelText("Cor")).toHaveValue("Prata");

    await preencherFormulario(user, { Cor: "Branco" });
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(substituirCarro).toHaveBeenCalledWith(1, {
      marca: "Toyota",
      modelo: "Corolla",
      ano: 2024,
      cor: "Branco",
      preco: 150000,
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Toyota Corolla atualizado.");
    expect(screen.getByRole("form", { name: "Cadastrar carro" })).toBeInTheDocument();
  });

  it("avisa quando o carro nao existe mais e recarrega a lista", async () => {
    const user = await renderizarPagina();
    vi.mocked(obterCarro).mockRejectedValue(new ApiError("Carro 1 nao encontrado", 404));
    vi.mocked(listarCarros).mockResolvedValue([civic]);

    await user.click(screen.getByRole("button", { name: "Editar Toyota Corolla" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o carro: Carro 1 nao encontrado",
    );
    expect(await screen.findByTestId("contador-carros")).toHaveTextContent("1 carro");
    expect(screen.getByRole("form", { name: "Cadastrar carro" })).toBeInTheDocument();
  });

  it("altera so o preco com PATCH", async () => {
    const user = await renderizarPagina();
    vi.mocked(atualizarCarro).mockResolvedValue({ ...civic, preco: 130000 });

    await user.click(screen.getByRole("button", { name: "Alterar preço de Honda Civic" }));
    await user.clear(screen.getByLabelText("Novo preço (R$)"));
    await user.type(screen.getByLabelText("Novo preço (R$)"), "130000");
    await user.click(screen.getByRole("button", { name: "Salvar preço" }));

    expect(atualizarCarro).toHaveBeenCalledWith(2, { preco: 130000 });
    expect(await screen.findByRole("status")).toHaveTextContent(
      /Preço de Honda Civic alterado para R\$\s130\.000,00\./,
    );
  });
});

describe("CarsPage: remocao", () => {
  it("remove pela API e recarrega a lista", async () => {
    const user = await renderizarPagina();
    vi.mocked(removerCarro).mockResolvedValue(null);
    vi.mocked(listarCarros).mockResolvedValue([civic]);

    await user.click(screen.getByRole("button", { name: "Remover Toyota Corolla" }));

    expect(removerCarro).toHaveBeenCalledWith(1);
    expect(await screen.findByRole("status")).toHaveTextContent("Toyota Corolla removido.");
    expect(await screen.findByTestId("contador-carros")).toHaveTextContent("1 carro");
    expect(screen.queryByText("Toyota Corolla")).not.toBeInTheDocument();
  });

  it("mostra o erro quando a API esta fora do ar", async () => {
    const user = await renderizarPagina();
    vi.mocked(removerCarro).mockRejectedValue(new ApiError(MENSAGEM_SEM_CONEXAO, 0));

    await user.click(screen.getByRole("button", { name: "Remover Honda Civic" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      `Não foi possível remover o carro: ${MENSAGEM_SEM_CONEXAO}`,
    );
    expect(itensDaLista()).toHaveLength(2);
  });
});
