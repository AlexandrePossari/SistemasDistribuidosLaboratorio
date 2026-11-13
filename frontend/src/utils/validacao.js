// Validacao inicial do formulario, com as mesmas regras de backend/app/schemas/livro.py.
// Evita enviar o que a API recusaria; a validacao que vale continua sendo a do backend.

export const LIMITES = { titulo: 200, autor: 120, notas: 5000 };

/** Remove espacos nas pontas e junta espacos repetidos, como o backend faz. */
export function normalizarEspacos(texto) {
  return String(texto ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

function validarTextoObrigatorio(valor, limite, obrigatorio, longo) {
  const texto = normalizarEspacos(valor);
  if (texto === "") {
    return obrigatorio;
  }
  return texto.length > limite ? longo : null;
}

/**
 * Valida os valores do formulario (strings) e devolve { campo: mensagem }
 * so com os campos invalidos.
 */
export function validarLivro(valores) {
  const erros = {
    titulo: validarTextoObrigatorio(
      valores.titulo,
      LIMITES.titulo,
      "Informe o título.",
      `O título pode ter no máximo ${LIMITES.titulo} caracteres.`,
    ),
    autor: validarTextoObrigatorio(
      valores.autor,
      LIMITES.autor,
      "Informe o autor.",
      `O autor pode ter no máximo ${LIMITES.autor} caracteres.`,
    ),
    notas:
      String(valores.notas ?? "").trim().length > LIMITES.notas
        ? `As notas podem ter no máximo ${LIMITES.notas} caracteres.`
        : null,
    avaliacao:
      valores.avaliacao !== "" && valores.status !== "lido"
        ? "Só é possível avaliar livros lidos."
        : null,
  };
  return Object.fromEntries(Object.entries(erros).filter(([, mensagem]) => mensagem !== null));
}

export function possuiErros(erros) {
  return Object.keys(erros).length > 0;
}

/** Converte os valores do formulario no corpo enviado para a API. */
export function montarLivro(valores) {
  return {
    titulo: normalizarEspacos(valores.titulo),
    autor: normalizarEspacos(valores.autor),
    notas: String(valores.notas ?? "").trim(),
    status: valores.status,
    avaliacao:
      valores.status === "lido" && valores.avaliacao !== "" ? Number(valores.avaliacao) : null,
  };
}
