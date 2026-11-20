// Funcoes puras sobre livros (sem React).

export const STATUS_LEITURA = [
  { valor: "quero_ler", rotulo: "Quero ler" },
  { valor: "lendo", rotulo: "Lendo" },
  { valor: "lido", rotulo: "Lido" },
];

export function rotuloDoStatus(status) {
  return STATUS_LEITURA.find((item) => item.valor === status)?.rotulo ?? status;
}

/** "2026-11-12" -> "12/11/2026", sem converter fuso horario (a API manda so a data). */
export function formatarData(dataIso) {
  if (!dataIso) {
    return "";
  }
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Corta notas longas na ultima palavra inteira antes do limite. */
export function resumirTexto(texto, limite) {
  if (texto.length <= limite) {
    return texto;
  }
  const corte = texto.slice(0, limite);
  // Se o corte caiu bem no fim de uma palavra, ela fica inteira.
  if (/\s/.test(texto[limite])) {
    return `${corte.trimEnd()}…`;
  }
  const ultimoEspaco = corte.lastIndexOf(" ");
  return `${(ultimoEspaco > 0 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()}…`;
}
