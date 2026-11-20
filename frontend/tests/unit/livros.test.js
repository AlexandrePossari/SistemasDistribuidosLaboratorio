import { describe, expect, it } from "vitest";
import { formatarData, resumirTexto, rotuloDoStatus } from "../../src/utils/livros.js";

describe("rotuloDoStatus", () => {
  it("traduz os status da API", () => {
    expect(rotuloDoStatus("quero_ler")).toBe("Quero ler");
    expect(rotuloDoStatus("lendo")).toBe("Lendo");
    expect(rotuloDoStatus("lido")).toBe("Lido");
  });
});

describe("formatarData", () => {
  it("converte a data ISO para dia/mes/ano sem mudar o dia por fuso horario", () => {
    expect(formatarData("2026-01-01")).toBe("01/01/2026");
  });

  it("devolve texto vazio sem data", () => {
    expect(formatarData(null)).toBe("");
  });
});

describe("resumirTexto", () => {
  it("mantem textos curtos", () => {
    expect(resumirTexto("curto", 10)).toBe("curto");
  });

  it("mantem a palavra quando o corte cai bem no fim dela", () => {
    expect(resumirTexto("um livro muito bom de ler", 14)).toBe("um livro muito…");
  });

  it("nao corta palavra no meio: volta ate o ultimo espaco", () => {
    expect(resumirTexto("um livro muito bom de ler", 12)).toBe("um livro…");
  });
});
