// Cliente HTTP compartilhado pelos servicos de cada entidade.

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(
  /\/+$/,
  "",
);

export const MENSAGEM_SEM_CONEXAO =
  "Não foi possível conectar à API. Verifique se o backend está rodando.";

export class ApiError extends Error {
  /** status 0 indica que nao houve resposta (API fora do ar, CORS, rede). */
  constructor(mensagem, status) {
    super(mensagem);
    this.name = "ApiError";
    this.status = status;
  }
}

function montarUrl(caminho, params) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor !== undefined && valor !== null && valor !== "") {
      busca.append(chave, String(valor));
    }
  }
  const query = busca.toString();
  return `${API_URL}${caminho}${query ? `?${query}` : ""}`;
}

/** Converte o "detail" do FastAPI (texto ou lista de erros de validacao) em mensagem. */
function mensagemDoDetalhe(detalhe) {
  if (typeof detalhe === "string") {
    return detalhe;
  }
  if (Array.isArray(detalhe)) {
    return detalhe
      .map(({ loc = [], msg }) => {
        const campo = loc.filter((parte) => parte !== "body").join(".");
        return campo ? `${campo}: ${msg}` : msg;
      })
      .join("; ");
  }
  return null;
}

async function lerErro(resposta) {
  try {
    const corpo = await resposta.json();
    const mensagem = mensagemDoDetalhe(corpo?.detail);
    if (mensagem) {
      return mensagem;
    }
  } catch {
    // Corpo vazio ou que nao e JSON: cai na mensagem generica abaixo.
  }
  return `A API respondeu com erro ${resposta.status}.`;
}

/**
 * Faz uma requisicao a API e trata os tres cenarios possiveis:
 * 1. sem resposta (fetch rejeita)   -> ApiError com status 0;
 * 2. resposta de erro (4xx / 5xx)   -> ApiError com o status e o detail da API;
 * 3. sucesso                        -> corpo JSON (ou null quando 204 No Content).
 */
export async function request(caminho, { method = "GET", body, params } = {}) {
  const opcoes = { method, headers: {} };
  if (body !== undefined) {
    opcoes.headers["Content-Type"] = "application/json";
    opcoes.body = JSON.stringify(body);
  }

  let resposta;
  try {
    resposta = await fetch(montarUrl(caminho, params), opcoes);
  } catch {
    throw new ApiError(MENSAGEM_SEM_CONEXAO, 0);
  }

  if (!resposta.ok) {
    throw new ApiError(await lerErro(resposta), resposta.status);
  }
  if (resposta.status === 204) {
    return null;
  }
  return resposta.json();
}
