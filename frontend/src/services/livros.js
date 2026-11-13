import { request } from "./api.js";

// Uma funcao para cada endpoint de backend/app/api/routes/livros.py.

const RECURSO = "/livros";

// Maior "limite" aceito pelo GET /livros.
export const LIMITE_MAXIMO = 100;

/** GET /livros: filtro opcional por status e busca no titulo/autor. */
export function listarLivros({ status, busca, limite = LIMITE_MAXIMO } = {}) {
  return request(RECURSO, { params: { status, busca: busca?.trim(), limite } });
}

/** GET /livros/resumo: quantidade de livros em cada status. */
export function obterResumo() {
  return request(`${RECURSO}/resumo`);
}

/** GET /livros/{id} */
export function obterLivro(id) {
  return request(`${RECURSO}/${id}`);
}

/** POST /livros */
export function criarLivro(dados) {
  return request(RECURSO, { method: "POST", body: dados });
}

/** PUT /livros/{id}: edicao completa. */
export function substituirLivro(id, dados) {
  return request(`${RECURSO}/${id}`, { method: "PUT", body: dados });
}

/** PATCH /livros/{id}: so os campos enviados (status, avaliacao...). */
export function atualizarLivro(id, alteracoes) {
  return request(`${RECURSO}/${id}`, { method: "PATCH", body: alteracoes });
}

/** DELETE /livros/{id} */
export function removerLivro(id) {
  return request(`${RECURSO}/${id}`, { method: "DELETE" });
}
