import { request } from "./api.js";

// Espelha os endpoints de backend/app/api/routes/cars.py.

const RECURSO = "/cars";

// Maior "limite" aceito pelo GET /cars do backend.
export const LIMITE_MAXIMO = 100;

/** GET /cars — filtro opcional por marca (exata, sem diferenciar maiusculas). */
export function listarCarros({ marca, limite = LIMITE_MAXIMO } = {}) {
  return request(RECURSO, { params: { marca: marca?.trim(), limite } });
}

/** GET /cars/{id} */
export function obterCarro(id) {
  return request(`${RECURSO}/${id}`);
}

/** POST /cars */
export function criarCarro(dados) {
  return request(RECURSO, { method: "POST", body: dados });
}

/** PUT /cars/{id} — substitui todos os campos. */
export function substituirCarro(id, dados) {
  return request(`${RECURSO}/${id}`, { method: "PUT", body: dados });
}

/** PATCH /cars/{id} — altera apenas os campos enviados. */
export function atualizarCarro(id, alteracoes) {
  return request(`${RECURSO}/${id}`, { method: "PATCH", body: alteracoes });
}

/** DELETE /cars/{id} */
export function removerCarro(id) {
  return request(`${RECURSO}/${id}`, { method: "DELETE" });
}
