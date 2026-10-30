import { describe, expect, it } from "vitest";
import { filtrarPorMarca, formatarPreco, proximoId } from "../../src/utils/cars.js";

const carros = [
  { id: 1, marca: "Toyota", modelo: "Corolla", ano: 2024, cor: "Prata", preco: 150000 },
  { id: 4, marca: "Honda", modelo: "Civic", ano: 2022, cor: "Preto", preco: 135000 },
  { id: 2, marca: "Toyota", modelo: "Hilux", ano: 2023, cor: "Branco", preco: 280000 },
];

describe("formatarPreco", () => {
  it("formata o valor em reais", () => {
    // O Intl usa espaco nao separavel entre "R$" e o numero.
    expect(formatarPreco(150000)).toBe("R$ 150.000,00");
  });
});

describe("filtrarPorMarca", () => {
  it("retorna todos os carros quando o termo esta vazio", () => {
    expect(filtrarPorMarca(carros, "  ")).toBe(carros);
  });

  it("filtra ignorando maiusculas e minusculas", () => {
    const resultado = filtrarPorMarca(carros, "toyo");

    expect(resultado.map((carro) => carro.modelo)).toEqual(["Corolla", "Hilux"]);
  });

  it("retorna lista vazia quando nenhuma marca casa", () => {
    expect(filtrarPorMarca(carros, "Fiat")).toEqual([]);
  });
});

describe("proximoId", () => {
  it("comeca em 1 quando nao ha carros", () => {
    expect(proximoId([])).toBe(1);
  });

  it("usa o maior id existente mais 1", () => {
    expect(proximoId(carros)).toBe(5);
  });
});
