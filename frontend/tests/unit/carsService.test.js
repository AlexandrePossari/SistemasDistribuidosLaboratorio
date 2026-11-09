import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "../../src/services/api.js";
import {
  atualizarCarro,
  criarCarro,
  LIMITE_MAXIMO,
  listarCarros,
  obterCarro,
  removerCarro,
  substituirCarro,
} from "../../src/services/cars.js";

// Confere que cada funcao do servico chama o endpoint certo do backend.
vi.mock("../../src/services/api.js", () => ({ request: vi.fn() }));

const dados = { marca: "Fiat", modelo: "Uno", ano: 2010, cor: "Vermelho", preco: 25000 };

beforeEach(() => {
  vi.mocked(request).mockReset();
  vi.mocked(request).mockResolvedValue("resposta");
});

describe("servico de carros", () => {
  it("listarCarros usa o limite maximo e nenhuma marca por padrao", async () => {
    await expect(listarCarros()).resolves.toBe("resposta");

    expect(request).toHaveBeenCalledWith("/cars", {
      params: { marca: undefined, limite: LIMITE_MAXIMO },
    });
  });

  it("listarCarros repassa a marca sem espacos nas pontas", async () => {
    await listarCarros({ marca: "  Toyota ", limite: 5 });

    expect(request).toHaveBeenCalledWith("/cars", { params: { marca: "Toyota", limite: 5 } });
  });

  it("obterCarro faz GET em /cars/{id}", async () => {
    await obterCarro(3);

    expect(request).toHaveBeenCalledWith("/cars/3");
  });

  it("criarCarro faz POST em /cars", async () => {
    await criarCarro(dados);

    expect(request).toHaveBeenCalledWith("/cars", { method: "POST", body: dados });
  });

  it("substituirCarro faz PUT em /cars/{id}", async () => {
    await substituirCarro(3, dados);

    expect(request).toHaveBeenCalledWith("/cars/3", { method: "PUT", body: dados });
  });

  it("atualizarCarro faz PATCH em /cars/{id} so com as alteracoes", async () => {
    await atualizarCarro(3, { preco: 30000 });

    expect(request).toHaveBeenCalledWith("/cars/3", { method: "PATCH", body: { preco: 30000 } });
  });

  it("removerCarro faz DELETE em /cars/{id}", async () => {
    await removerCarro(3);

    expect(request).toHaveBeenCalledWith("/cars/3", { method: "DELETE" });
  });
});
