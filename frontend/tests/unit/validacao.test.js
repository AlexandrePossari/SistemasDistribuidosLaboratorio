import { describe, expect, it } from "vitest";
import {
  LIMITES,
  montarLivro,
  normalizarEspacos,
  possuiErros,
  validarLivro,
} from "../../src/utils/validacao.js";

const valido = {
  titulo: "Duna",
  autor: "Frank Herbert",
  status: "quero_ler",
  avaliacao: "",
  notas: "",
};

describe("normalizarEspacos", () => {
  it("remove espacos nas pontas e junta espacos repetidos", () => {
    expect(normalizarEspacos("  O   Hobbit \t")).toBe("O Hobbit");
  });

  it("trata valores vazios", () => {
    expect(normalizarEspacos(undefined)).toBe("");
    expect(normalizarEspacos("   ")).toBe("");
  });
});

describe("validarLivro", () => {
  it("aceita um livro valido", () => {
    expect(validarLivro(valido)).toEqual({});
  });

  it("exige titulo e autor, mesmo que so com espacos", () => {
    expect(validarLivro({ ...valido, titulo: "   ", autor: "" })).toEqual({
      titulo: "Informe o título.",
      autor: "Informe o autor.",
    });
  });

  it("limita o tamanho de titulo, autor e notas", () => {
    const erros = validarLivro({
      ...valido,
      titulo: "a".repeat(LIMITES.titulo + 1),
      autor: "a".repeat(LIMITES.autor + 1),
      notas: "a".repeat(LIMITES.notas + 1),
    });

    expect(Object.keys(erros).sort()).toEqual(["autor", "notas", "titulo"]);
  });

  it("aceita os tamanhos maximos", () => {
    expect(
      validarLivro({
        ...valido,
        titulo: "a".repeat(LIMITES.titulo),
        autor: "a".repeat(LIMITES.autor),
        notas: "a".repeat(LIMITES.notas),
      }),
    ).toEqual({});
  });

  it("so permite avaliar livros lidos", () => {
    expect(validarLivro({ ...valido, status: "lendo", avaliacao: "4" })).toEqual({
      avaliacao: "Só é possível avaliar livros lidos.",
    });
    expect(validarLivro({ ...valido, status: "lido", avaliacao: "4" })).toEqual({});
  });
});

describe("possuiErros", () => {
  it("indica se ha algum campo invalido", () => {
    expect(possuiErros({})).toBe(false);
    expect(possuiErros({ titulo: "Informe o título." })).toBe(true);
  });
});

describe("montarLivro", () => {
  it("normaliza os textos e converte a avaliacao em numero", () => {
    expect(
      montarLivro({
        titulo: "  O   Hobbit ",
        autor: " Tolkien ",
        status: "lido",
        avaliacao: "5",
        notas: "  ótimo\nreler  ",
      }),
    ).toEqual({
      titulo: "O Hobbit",
      autor: "Tolkien",
      status: "lido",
      avaliacao: 5,
      notas: "ótimo\nreler",
    });
  });

  it("envia avaliacao null quando nao ha nota ou o livro nao esta lido", () => {
    expect(montarLivro({ ...valido, status: "lido", avaliacao: "" }).avaliacao).toBeNull();
    expect(montarLivro({ ...valido, status: "lendo", avaliacao: "3" }).avaliacao).toBeNull();
  });
});
