import { describe, expect, it } from "vitest";
import { formatarPreco, nomeDoCarro } from "../../src/utils/cars.js";

describe("formatarPreco", () => {
  it("formata o valor em reais", () => {
    // O Intl usa espaco nao separavel entre "R$" e o numero.
    expect(formatarPreco(150000)).toBe("R$ 150.000,00");
  });

  it("mantem os centavos", () => {
    expect(formatarPreco(99999.9)).toBe("R$ 99.999,90");
  });
});

describe("nomeDoCarro", () => {
  it("junta marca e modelo", () => {
    expect(nomeDoCarro({ marca: "Toyota", modelo: "Corolla" })).toBe("Toyota Corolla");
  });
});
