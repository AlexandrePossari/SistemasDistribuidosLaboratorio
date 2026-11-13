// Cliente HTTP usado pelos servicos de cada recurso da API.

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(
  /\/+$/,
  "",
);

export const MENSAGEM_SEM_CONEXAO =
  "Não foi possível conectar à API. Verifique se o backend está rodando.";

export class ApiError extends Error {
  /** status 0 = nenhuma resposta (API fora do ar, rede ou CORS). */
  constructor(mensagem, status) {
    super(mensagem);
    this.name = "ApiError";
    this.status = status;
  }
}

function montarUrl(caminho, params) {
  const query = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor !== undefined && valor !== null && valor !== "") {
      query.append(chave, String(valor));
    }
  }
  const texto = query.toString();
  return `${API_URL}${caminho}${texto ? `?${texto}` : ""}`;
}

/** Transforma o "detail" do FastAPI (texto ou lista de erros de validacao) em mensagem. */
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

async function lerMensagemDeErro(resposta) {
  try {
    const mensagem = mensagemDoDetalhe((await resposta.json())?.detail);
    if (mensagem) {
      return mensagem;
    }
  } catch {
    // Corpo vazio ou que nao e JSON: usa a mensagem generica abaixo.
  }
  return `A API respondeu com erro ${resposta.status}.`;
}

/**
 * Faz uma requisicao e trata os tres cenarios possiveis:
 * 1. a API nao responde (o fetch e rejeitado) -> ApiError com status 0;
 * 2. a API responde com erro (4xx/5xx)        -> ApiError com o status e o "detail";
 * 3. sucesso                                  -> JSON da resposta (null no 204).
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
    throw new ApiError(await lerMensagemDeErro(resposta), resposta.status);
  }
  return resposta.status === 204 ? null : resposta.json();
}
