// Regras de validacao de um carro. Espelham o schema CarBase do backend
// (backend/app/schemas/car.py) para que o formulario recuse o que a API recusaria.

export const ANO_MINIMO = 1886;
export const ANO_MAXIMO = 2100;

const LIMITES_TEXTO = {
  marca: { rotulo: "Marca", maximo: 50, obrigatorio: "Marca é obrigatória." },
  modelo: { rotulo: "Modelo", maximo: 50, obrigatorio: "Modelo é obrigatório." },
  cor: { rotulo: "Cor", maximo: 30, obrigatorio: "Cor é obrigatória." },
};

function validarTexto(campo, valor) {
  const { rotulo, maximo, obrigatorio } = LIMITES_TEXTO[campo];
  const texto = String(valor ?? "").trim();

  if (texto.length === 0) {
    return obrigatorio;
  }
  if (texto.length > maximo) {
    return `${rotulo} deve ter no máximo ${maximo} caracteres.`;
  }
  return null;
}

function validarAno(valor) {
  const texto = String(valor ?? "").trim();
  if (texto === "") {
    return "Ano é obrigatório.";
  }
  const ano = Number(texto);
  if (!Number.isInteger(ano)) {
    return "Ano deve ser um número inteiro.";
  }
  if (ano < ANO_MINIMO || ano > ANO_MAXIMO) {
    return `Ano deve estar entre ${ANO_MINIMO} e ${ANO_MAXIMO}.`;
  }
  return null;
}

function validarPreco(valor) {
  const texto = String(valor ?? "").trim();
  if (texto === "") {
    return "Preço é obrigatório.";
  }
  const preco = Number(texto);
  if (!Number.isFinite(preco) || preco <= 0) {
    return "Preço deve ser maior que zero.";
  }
  return null;
}

/**
 * Valida os valores do formulario de carro.
 * Retorna um objeto { campo: mensagem } apenas com os campos invalidos.
 */
export function validarCarro(valores) {
  const erros = {
    marca: validarTexto("marca", valores.marca),
    modelo: validarTexto("modelo", valores.modelo),
    ano: validarAno(valores.ano),
    cor: validarTexto("cor", valores.cor),
    preco: validarPreco(valores.preco),
  };

  return Object.fromEntries(Object.entries(erros).filter(([, mensagem]) => mensagem !== null));
}

export function possuiErros(erros) {
  return Object.keys(erros).length > 0;
}

/** Converte os valores (strings) do formulario em um carro com os tipos corretos. */
export function normalizarCarro(valores) {
  return {
    marca: valores.marca.trim(),
    modelo: valores.modelo.trim(),
    ano: Number(valores.ano),
    cor: valores.cor.trim(),
    preco: Number(valores.preco),
  };
}
