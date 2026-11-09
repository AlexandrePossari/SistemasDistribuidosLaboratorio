import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL, ApiError, MENSAGEM_SEM_CONEXAO, request } from "../../src/services/api.js";

// O fetch e substituido por um mock: estes testes nao dependem do backend.

function respostaJson(status, corpo) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function capturarErro(promessa) {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error("a promessa deveria ter sido rejeitada");
}

describe("request: sucesso", () => {
  it("faz GET na URL da API e devolve o JSON", async () => {
    fetchMock.mockResolvedValue(respostaJson(200, [{ id: 1 }]));

    await expect(request("/cars")).resolves.toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/cars`, { method: "GET", headers: {} });
  });

  it("monta a query string ignorando parametros vazios", async () => {
    fetchMock.mockResolvedValue(respostaJson(200, []));

    await request("/cars", { params: { marca: "Fiat Uno", limite: 100, vazio: "", nada: null } });

    expect(fetchMock.mock.calls[0][0]).toBe(`${API_URL}/cars?marca=Fiat+Uno&limite=100`);
  });

  it("envia o corpo como JSON", async () => {
    fetchMock.mockResolvedValue(respostaJson(201, { id: 7 }));

    await request("/cars", { method: "POST", body: { marca: "Fiat" } });

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/cars`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marca: "Fiat" }),
    });
  });

  it("devolve null quando a API responde 204 No Content", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(request("/cars/1", { method: "DELETE" })).resolves.toBeNull();
  });
});

describe("request: sem conexao com a API", () => {
  it("lanca ApiError com status 0 quando o fetch e rejeitado", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const erro = await capturarErro(request("/cars"));

    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.status).toBe(0);
    expect(erro.message).toBe(MENSAGEM_SEM_CONEXAO);
  });
});

describe("request: resposta de erro da API", () => {
  it("usa o detail em texto do FastAPI", async () => {
    fetchMock.mockResolvedValue(respostaJson(404, { detail: "Carro 9 nao encontrado" }));

    const erro = await capturarErro(request("/cars/9"));

    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.status).toBe(404);
    expect(erro.message).toBe("Carro 9 nao encontrado");
  });

  it("junta os erros de validacao (422) com o nome de cada campo", async () => {
    fetchMock.mockResolvedValue(
      respostaJson(422, {
        detail: [
          { loc: ["body", "ano"], msg: "Input should be less than or equal to 2100" },
          { loc: ["body", "preco"], msg: "Input should be greater than 0" },
        ],
      }),
    );

    const erro = await capturarErro(request("/cars", { method: "POST", body: {} }));

    expect(erro.status).toBe(422);
    expect(erro.message).toBe(
      "ano: Input should be less than or equal to 2100; preco: Input should be greater than 0",
    );
  });

  it("usa mensagem generica quando o corpo nao e JSON", async () => {
    fetchMock.mockResolvedValue(new Response("Internal Server Error", { status: 500 }));

    const erro = await capturarErro(request("/cars"));

    expect(erro.status).toBe(500);
    expect(erro.message).toBe("A API respondeu com erro 500.");
  });
});
