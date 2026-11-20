import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BibliotecaPage from "../../src/pages/BibliotecaPage.jsx";
import { ApiError, MENSAGEM_SEM_CONEXAO } from "../../src/services/api.js";
import {
  atualizarLivro,
  criarLivro,
  listarLivros,
  obterLivro,
  obterResumo,
  removerLivro,
  substituirLivro,
} from "../../src/services/livros.js";

// A pagina inteira (resumo, formulario, filtros, lista e avisos) conversando com o
// servico de livros. O servico e mockado: o foco e a integracao entre os componentes e
// as chamadas a API, sem depender do backend nem do banco.
vi.mock("../../src/services/livros.js", () => ({
  listarLivros: vi.fn(),
  obterResumo: vi.fn(),
  obterLivro: vi.fn(),
  criarLivro: vi.fn(),
  substituirLivro: vi.fn(),
  atualizarLivro: vi.fn(),
  removerLivro: vi.fn(),
}));

const duna = {
  id: 1,
  titulo: "Duna",
  autor: "Frank Herbert",
  status: "lendo",
  avaliacao: null,
  notas: "",
  concluido_em: null,
};
const hobbit = {
  id: 2,
  titulo: "O Hobbit",
  autor: "J. R. R. Tolkien",
  status: "lido",
  avaliacao: 4,
  notas: "Clássico",
  concluido_em: "2026-11-10",
};
const resumo = { quero_ler: 0, lendo: 1, lido: 1, total: 2 };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listarLivros).mockResolvedValue([duna, hobbit]);
  vi.mocked(obterResumo).mockResolvedValue(resumo);
});

async function abrirPagina() {
  const user = userEvent.setup();
  render(<BibliotecaPage />);
  await screen.findByRole("list", { name: "Livros" });
  return user;
}

function cardDe(titulo) {
  return screen.getByRole("heading", { name: titulo }).closest("li");
}

describe("BibliotecaPage: carregamento", () => {
  it("mostra o carregamento, depois os livros e o resumo vindos da API", async () => {
    render(<BibliotecaPage />);

    expect(screen.getByText("Carregando livros...")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Duna" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "O Hobbit" })).toBeInTheDocument();
    expect(await screen.findByTestId("resumo-lido")).toHaveTextContent("1");
    expect(listarLivros).toHaveBeenCalledWith({ status: "", busca: "" });
  });

  it("mostra o estado vazio quando nao ha livros", async () => {
    vi.mocked(listarLivros).mockResolvedValue([]);
    render(<BibliotecaPage />);

    expect(
      await screen.findByText("Nenhum livro ainda — adicione o primeiro."),
    ).toBeInTheDocument();
  });

  it("mostra o erro com a API fora do ar e tenta de novo", async () => {
    vi.mocked(listarLivros)
      .mockRejectedValueOnce(new ApiError(MENSAGEM_SEM_CONEXAO, 0))
      .mockResolvedValueOnce([duna]);
    const user = userEvent.setup();
    render(<BibliotecaPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      `Não foi possível carregar os livros: ${MENSAGEM_SEM_CONEXAO}`,
    );

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByRole("heading", { name: "Duna" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("BibliotecaPage: filtros", () => {
  it("filtra por status e busca pela API", async () => {
    const user = await abrirPagina();
    vi.mocked(listarLivros).mockResolvedValue([hobbit]);

    await user.click(screen.getByRole("button", { name: "Lido" }));
    expect(listarLivros).toHaveBeenLastCalledWith({ status: "lido", busca: "" });

    await user.type(screen.getByLabelText("Buscar por título ou autor"), "tolkien");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(listarLivros).toHaveBeenLastCalledWith({ status: "lido", busca: "tolkien" });
  });

  it("avisa quando os filtros nao encontram nada", async () => {
    const user = await abrirPagina();
    vi.mocked(listarLivros).mockResolvedValue([]);

    await user.click(screen.getByRole("button", { name: "Quero ler" }));

    expect(
      await screen.findByText("Nenhum livro encontrado com esses filtros."),
    ).toBeInTheDocument();
  });
});

describe("BibliotecaPage: cadastro e edicao", () => {
  it("adiciona um livro, avisa e recarrega lista e resumo", async () => {
    const user = await abrirPagina();
    const novo = { ...duna, id: 3, titulo: "Fundação", autor: "Isaac Asimov", status: "quero_ler" };
    vi.mocked(criarLivro).mockResolvedValue(novo);
    vi.mocked(listarLivros).mockResolvedValue([novo, duna, hobbit]);

    await user.type(screen.getByLabelText("Título"), "Fundação");
    await user.type(screen.getByLabelText("Autor"), "Isaac Asimov");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(criarLivro).toHaveBeenCalledWith({
      titulo: "Fundação",
      autor: "Isaac Asimov",
      status: "quero_ler",
      avaliacao: null,
      notas: "",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      '"Fundação" adicionado à biblioteca.',
    );
    expect(await screen.findByRole("heading", { name: "Fundação" })).toBeInTheDocument();
    expect(obterResumo).toHaveBeenCalledTimes(2);
  });

  it("mostra o erro da API (409) e mantem o formulario preenchido", async () => {
    const user = await abrirPagina();
    vi.mocked(criarLivro).mockRejectedValue(
      new ApiError('Já existe um livro "Duna" de Frank Herbert', 409),
    );

    await user.type(screen.getByLabelText("Título"), "Duna");
    await user.type(screen.getByLabelText("Autor"), "Frank Herbert");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      'Não foi possível adicionar o livro: Já existe um livro "Duna" de Frank Herbert',
    );
    expect(screen.getByLabelText("Título")).toHaveValue("Duna");
  });

  it("edita: busca o livro na API, preenche o formulario e salva com PUT", async () => {
    const user = await abrirPagina();
    vi.mocked(obterLivro).mockResolvedValue(duna);
    vi.mocked(substituirLivro).mockResolvedValue({ ...duna, notas: "Muito bom" });

    await user.click(screen.getByRole("button", { name: "Editar Duna" }));
    const formulario = await screen.findByRole("form", { name: 'Editar "Duna"' });
    expect(obterLivro).toHaveBeenCalledWith(1);

    await user.type(within(formulario).getByLabelText("Notas"), "Muito bom");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(substituirLivro).toHaveBeenCalledWith(1, {
      titulo: "Duna",
      autor: "Frank Herbert",
      status: "lendo",
      avaliacao: null,
      notas: "Muito bom",
    });
    expect(await screen.findByRole("status")).toHaveTextContent('"Duna" atualizado.');
    expect(screen.getByRole("form", { name: "Adicionar livro" })).toBeInTheDocument();
  });

  it("avisa quando o livro a editar nao existe mais e recarrega a lista", async () => {
    const user = await abrirPagina();
    vi.mocked(obterLivro).mockRejectedValue(new ApiError("Livro 1 não encontrado", 404));
    vi.mocked(listarLivros).mockResolvedValue([hobbit]);

    await user.click(screen.getByRole("button", { name: "Editar Duna" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível abrir o livro: Livro 1 não encontrado",
    );
    expect(listarLivros).toHaveBeenCalledTimes(2);
  });
});

describe("BibliotecaPage: acoes rapidas", () => {
  it("muda o status com PATCH", async () => {
    const user = await abrirPagina();
    vi.mocked(atualizarLivro).mockResolvedValue({
      ...duna,
      status: "lido",
      concluido_em: "2026-11-13",
    });

    await user.selectOptions(screen.getByLabelText("Status de Duna"), "lido");

    expect(atualizarLivro).toHaveBeenCalledWith(1, { status: "lido" });
    expect(await screen.findByRole("status")).toHaveTextContent('"Duna" agora está em Lido.');
  });

  it("avalia um livro lido com PATCH", async () => {
    const user = await abrirPagina();
    vi.mocked(atualizarLivro).mockResolvedValue({ ...hobbit, avaliacao: 5 });

    await user.click(screen.getByRole("button", { name: "Avaliar O Hobbit com 5 de 5" }));

    expect(atualizarLivro).toHaveBeenCalledWith(2, { avaliacao: 5 });
    expect(await screen.findByRole("status")).toHaveTextContent('"O Hobbit" avaliado com 5 de 5.');
  });

  it("mostra o erro de regra de negocio devolvido pela API (422)", async () => {
    const user = await abrirPagina();
    vi.mocked(atualizarLivro).mockRejectedValue(
      new ApiError("Só é possível avaliar livros lidos", 422),
    );

    await user.click(screen.getByRole("button", { name: "Avaliar O Hobbit com 5 de 5" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar a avaliação: Só é possível avaliar livros lidos",
    );
  });

  it("exclui depois da confirmacao", async () => {
    const user = await abrirPagina();
    vi.mocked(removerLivro).mockResolvedValue(null);
    vi.mocked(listarLivros).mockResolvedValue([hobbit]);

    await user.click(within(cardDe("Duna")).getByRole("button", { name: "Excluir Duna" }));
    await user.click(within(cardDe("Duna")).getByRole("button", { name: "Sim, excluir" }));

    expect(removerLivro).toHaveBeenCalledWith(1);
    expect(await screen.findByRole("status")).toHaveTextContent('"Duna" excluído.');
    expect(screen.queryByRole("heading", { name: "Duna" })).not.toBeInTheDocument();
  });

  it("mostra o erro quando a API cai durante a exclusao", async () => {
    const user = await abrirPagina();
    vi.mocked(removerLivro).mockRejectedValue(new ApiError(MENSAGEM_SEM_CONEXAO, 0));

    await user.click(within(cardDe("Duna")).getByRole("button", { name: "Excluir Duna" }));
    await user.click(within(cardDe("Duna")).getByRole("button", { name: "Sim, excluir" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      `Não foi possível excluir o livro: ${MENSAGEM_SEM_CONEXAO}`,
    );
    expect(screen.getByRole("heading", { name: "Duna" })).toBeInTheDocument();
  });
});
