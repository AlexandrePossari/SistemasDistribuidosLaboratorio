// Funcoes puras de apoio a lista de carros (sem React).

const formatadorPreco = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarPreco(preco) {
  return formatadorPreco.format(preco);
}

export function nomeDoCarro(carro) {
  return `${carro.marca} ${carro.modelo}`;
}
