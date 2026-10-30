// Funcoes puras de apoio a lista de carros (sem React).

const formatadorPreco = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarPreco(preco) {
  return formatadorPreco.format(preco);
}

/** Filtra os carros cuja marca contem o termo, ignorando maiusculas e espacos nas pontas. */
export function filtrarPorMarca(carros, termo) {
  const busca = termo.trim().toLowerCase();
  if (busca === "") {
    return carros;
  }
  return carros.filter((carro) => carro.marca.toLowerCase().includes(busca));
}

/** Gera o proximo id local, ja que ainda nao ha backend para atribui-lo. */
export function proximoId(carros) {
  return carros.reduce((maior, carro) => Math.max(maior, carro.id), 0) + 1;
}
