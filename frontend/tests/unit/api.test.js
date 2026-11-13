import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL, ApiError, MENSAGEM_SEM_CONEXAO, request } from "../../src/services/api.js";

// O fetch e trocado por um mock: estes testes nao dependem do backend.

function respostaJson(status, corpo) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function erroDe(promessa) {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error("a requisicao deveria ter falhado");
}

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request: sucesso", () => {
  it("faz GET na URL da API e devolve o JSON", async () => {
    fetchMock.mockResolvedValue(respostaJson(200, [{ id: 1 }]));

    await expect(request("/livros")).resolves.toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/livros`, { method: "GET", headers: {} });
  });

  it("monta a query string ignorando parametros vazios", async () => {
    fetchMock.mockResolvedValue(respostaJson(200, []));

    await request("/livros", {
      params: { status: "lido", busca: "o hobbit", vazio: "", nulo: null },
    });

    expect(fetchMock.mock.calls[0][0]).toBe(`${API_URL}/livros?status=lido&busca=o+hobbit`);
  });

  it("envia o corpo como JSON", async () => {
    fetchMock.mockResolvedValue(respostaJson(201, { id: 3 }));

    await request("/livros", { method: "POST", body: { titulo: "Duna" } });

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/livros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: "Duna" }),
    });
  });

  it("devolve null no 204 No Content", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(request("/livros/1", { method: "DELETE" })).resolves.toBeNull();
  });
});

describe("request: API fora do ar", () => {
  it("lanca ApiError com status 0 quando o fetch e rejeitado", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const erro = await erroDe(request("/livros"));

    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.status).toBe(0);
    expect(erro.message).toBe(MENSAGEM_SEM_CONEXAO);
  });
});

describe("request: resposta de erro", () => {
  it("usa o detail em texto (404, 409, 422 de regra de negocio)", async () => {
    fetchMock.mockResolvedValue(
      respostaJson(409, { detail: 'Já existe um livro "Duna" de Frank Herbert' }),
    );

    const erro = await erroDe(request("/livros", { method: "POST", body: {} }));

    expect(erro.status).toBe(409);
    expect(erro.message).toBe('Já existe um livro "Duna" de Frank Herbert');
  });

  it("junta os erros de validacao do FastAPI com o nome de cada campo", async () => {
    fetchMock.mockResolvedValue(
      respostaJson(422, {
        detail: [
          { loc: ["body", "titulo"], msg: "String should have at least 1 character" },
          { loc: ["query", "limite"], msg: "Input should be less than or equal to 100" },
        ],
      }),
    );

    const erro = await erroDe(request("/livros"));

    expect(erro.message).toBe(
      "titulo: String should have at least 1 character; query.limite: Input should be less than or equal to 100",
    );
  });

  it("usa mensagem generica quando o corpo nao e JSON", async () => {
    fetchMock.mockResolvedValue(new Response("Bad Gateway", { status: 502 }));

    const erro = await erroDe(request("/livros"));

    expect(erro.status).toBe(502);
    expect(erro.message).toBe("A API respondeu com erro 502.");
  });
});
