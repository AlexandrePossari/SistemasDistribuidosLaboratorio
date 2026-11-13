import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "../../src/services/api.js";
import {
  atualizarLivro,
  criarLivro,
  LIMITE_MAXIMO,
  listarLivros,
  obterLivro,
  obterResumo,
  removerLivro,
  substituirLivro,
} from "../../src/services/livros.js";

// Confere que cada funcao chama o endpoint e o metodo certos da API.
vi.mock("../../src/services/api.js", () => ({ request: vi.fn() }));

const livro = { titulo: "Duna", autor: "Frank Herbert", status: "lido", avaliacao: 5, notas: "" };

beforeEach(() => {
  vi.mocked(request).mockReset();
  vi.mocked(request).mockResolvedValue("resposta");
});

describe("servico de livros", () => {
  it("listarLivros pede o limite maximo e repassa os filtros", async () => {
    await expect(listarLivros({ status: "lido", busca: "  duna " })).resolves.toBe("resposta");

    expect(request).toHaveBeenCalledWith("/livros", {
      params: { status: "lido", busca: "duna", limite: LIMITE_MAXIMO },
    });
  });

  it("listarLivros sem filtros", async () => {
    await listarLivros();

    expect(request).toHaveBeenCalledWith("/livros", {
      params: { status: undefined, busca: undefined, limite: LIMITE_MAXIMO },
    });
  });

  it("obterResumo faz GET em /livros/resumo", async () => {
    await obterResumo();

    expect(request).toHaveBeenCalledWith("/livros/resumo");
  });

  it("obterLivro faz GET em /livros/{id}", async () => {
    await obterLivro(7);

    expect(request).toHaveBeenCalledWith("/livros/7");
  });

  it("criarLivro faz POST em /livros", async () => {
    await criarLivro(livro);

    expect(request).toHaveBeenCalledWith("/livros", { method: "POST", body: livro });
  });

  it("substituirLivro faz PUT em /livros/{id}", async () => {
    await substituirLivro(7, livro);

    expect(request).toHaveBeenCalledWith("/livros/7", { method: "PUT", body: livro });
  });

  it("atualizarLivro faz PATCH em /livros/{id} so com as alteracoes", async () => {
    await atualizarLivro(7, { avaliacao: null });

    expect(request).toHaveBeenCalledWith("/livros/7", {
      method: "PATCH",
      body: { avaliacao: null },
    });
  });

  it("removerLivro faz DELETE em /livros/{id}", async () => {
    await removerLivro(7);

    expect(request).toHaveBeenCalledWith("/livros/7", { method: "DELETE" });
  });
});
