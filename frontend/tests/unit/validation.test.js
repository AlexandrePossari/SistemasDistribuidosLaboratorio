import { describe, expect, it } from "vitest";
import {
  ANO_MAXIMO,
  ANO_MINIMO,
  normalizarCarro,
  possuiErros,
  validarCarro,
} from "../../src/utils/validation.js";

const carroValido = {
  marca: "Toyota",
  modelo: "Corolla",
  ano: "2024",
  cor: "Prata",
  preco: "150000",
};

describe("validarCarro", () => {
  it("nao retorna erros para um carro valido", () => {
    expect(validarCarro(carroValido)).toEqual({});
  });

  it("exige todos os campos", () => {
    const erros = validarCarro({ marca: "", modelo: "", ano: "", cor: "", preco: "" });

    expect(erros).toEqual({
      marca: "Marca é obrigatória.",
      modelo: "Modelo é obrigatório.",
      ano: "Ano é obrigatório.",
      cor: "Cor é obrigatória.",
      preco: "Preço é obrigatório.",
    });
  });

  it("considera texto apenas com espacos como vazio", () => {
    expect(validarCarro({ ...carroValido, marca: "   " }).marca).toBe("Marca é obrigatória.");
  });

  it("limita o tamanho dos campos de texto", () => {
    const erros = validarCarro({ ...carroValido, marca: "a".repeat(51), cor: "a".repeat(31) });

    expect(erros.marca).toBe("Marca deve ter no máximo 50 caracteres.");
    expect(erros.cor).toBe("Cor deve ter no máximo 30 caracteres.");
  });

  it("aceita os anos limite", () => {
    expect(validarCarro({ ...carroValido, ano: String(ANO_MINIMO) })).toEqual({});
    expect(validarCarro({ ...carroValido, ano: String(ANO_MAXIMO) })).toEqual({});
  });

  it.each([String(ANO_MINIMO - 1), String(ANO_MAXIMO + 1)])(
    "recusa o ano %s fora do intervalo",
    (ano) => {
      expect(validarCarro({ ...carroValido, ano }).ano).toBe(
        `Ano deve estar entre ${ANO_MINIMO} e ${ANO_MAXIMO}.`,
      );
    },
  );

  it("recusa ano que nao e inteiro", () => {
    expect(validarCarro({ ...carroValido, ano: "2020.5" }).ano).toBe(
      "Ano deve ser um número inteiro.",
    );
  });

  it.each(["0", "-10", "abc"])("recusa o preco %s", (preco) => {
    expect(validarCarro({ ...carroValido, preco }).preco).toBe("Preço deve ser maior que zero.");
  });
});

describe("possuiErros", () => {
  it("indica se o objeto de erros tem algum campo", () => {
    expect(possuiErros({})).toBe(false);
    expect(possuiErros({ marca: "Marca é obrigatória." })).toBe(true);
  });
});

describe("normalizarCarro", () => {
  it("remove espacos e converte ano e preco para numero", () => {
    const carro = normalizarCarro({ ...carroValido, marca: "  Toyota ", preco: "99999.90" });

    expect(carro).toEqual({
      marca: "Toyota",
      modelo: "Corolla",
      ano: 2024,
      cor: "Prata",
      preco: 99999.9,
    });
  });
});
