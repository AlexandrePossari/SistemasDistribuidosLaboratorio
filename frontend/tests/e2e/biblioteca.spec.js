import { expect, test } from "@playwright/test";

// Fluxos completos no navegador (Chromium) contra a aplicacao real:
// frontend -> API -> PostgreSQL. Nada e mockado, exceto no teste da API fora do ar.
//
// O banco pode ter outros livros, entao cada teste usa um prefixo unico no titulo,
// busca por ele na tela e apaga pela API o que cadastrou.

const API_URL = (process.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");
const AUTOR = "Autora E2E";

let prefixo;

test.beforeEach(() => {
  const sufixo = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  prefixo = `E2E-${test.info().workerIndex}-${sufixo}`;
});

test.afterEach(async ({ request }) => {
  const resposta = await request.get(`${API_URL}/livros`, {
    params: { busca: prefixo, limite: 100 },
  });
  for (const livro of await resposta.json()) {
    await request.delete(`${API_URL}/livros/${livro.id}`);
  }
});

async function buscarNaTela(page, termo = prefixo) {
  await page.getByLabel("Buscar por título ou autor").fill(termo);
  await page.getByRole("button", { name: "Buscar" }).click();
}

async function adicionarPelaTela(page, titulo) {
  await page.getByLabel("Título", { exact: true }).fill(titulo);
  await page.getByLabel("Autor", { exact: true }).fill(AUTOR);
  await page.getByRole("button", { name: "Adicionar" }).click();
}

function card(page, titulo) {
  return page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: titulo }) });
}

function formatar(dataIso) {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

test("abre a biblioteca com o resumo e a lista vindos da API", async ({ page }) => {
  const resumo = page.waitForResponse(
    (resposta) => resposta.url() === `${API_URL}/livros/resumo` && resposta.ok(),
  );

  await page.goto("/");

  await resumo;
  await expect(page).toHaveTitle("Minha Biblioteca");
  await expect(page.getByRole("heading", { name: "Minha Biblioteca", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Resumo da biblioteca")).toBeVisible();
  await expect(page.getByRole("form", { name: "Adicionar livro" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("adiciona, busca, edita e exclui um livro (CRUD completo)", async ({ page }) => {
  const titulo = `${prefixo} Duna`;
  await page.goto("/");

  // POST
  await adicionarPelaTela(page, titulo);
  await expect(page.getByRole("status")).toHaveText(`"${titulo}" adicionado à biblioteca.`);

  // GET com busca
  await buscarNaTela(page);
  await expect(page.getByRole("list", { name: "Livros" }).getByRole("listitem")).toHaveCount(1);
  await expect(card(page, titulo)).toContainText(AUTOR);

  // GET por id + PUT
  await card(page, titulo)
    .getByRole("button", { name: `Editar ${titulo}` })
    .click();
  const formulario = page.getByRole("form", { name: `Editar "${titulo}"` });
  await expect(formulario.getByLabel("Título", { exact: true })).toHaveValue(titulo);
  await formulario.getByLabel("Notas", { exact: true }).fill("Começa devagar, mas vale a pena.");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("status")).toHaveText(`"${titulo}" atualizado.`);
  await expect(card(page, titulo)).toContainText("Começa devagar, mas vale a pena.");

  // DELETE com confirmacao
  await card(page, titulo)
    .getByRole("button", { name: `Excluir ${titulo}` })
    .click();
  await card(page, titulo).getByRole("button", { name: "Sim, excluir" }).click();
  await expect(page.getByRole("status")).toHaveText(`"${titulo}" excluído.`);
  await expect(page.getByText("Nenhum livro encontrado com esses filtros.")).toBeVisible();
});

test("marca como lido, avalia e a avaliacao continua la depois de recarregar", async ({
  page,
  request,
}) => {
  const titulo = `${prefixo} O Hobbit`;
  await page.goto("/");
  await adicionarPelaTela(page, titulo);
  await buscarNaTela(page);

  // PATCH status: o livro lido ganha data de conclusao e estrelas
  await card(page, titulo).getByLabel(`Status de ${titulo}`).selectOption("lido");
  await expect(page.getByRole("status")).toHaveText(`"${titulo}" agora está em Lido.`);

  // PATCH avaliacao
  await card(page, titulo)
    .getByRole("button", { name: `Avaliar ${titulo} com 4 de 5` })
    .click();
  await expect(page.getByRole("status")).toHaveText(`"${titulo}" avaliado com 4 de 5.`);

  // Persistencia: os dados estao no banco e voltam depois de recarregar a pagina
  const [salvo] = await (
    await request.get(`${API_URL}/livros`, { params: { busca: prefixo } })
  ).json();
  expect(salvo).toMatchObject({ status: "lido", avaliacao: 4 });
  expect(salvo.concluido_em).not.toBeNull();

  await page.reload();
  await buscarNaTela(page);
  await expect(card(page, titulo)).toContainText(`Lido em ${formatar(salvo.concluido_em)}`);
  await expect(
    card(page, titulo).getByRole("button", { name: `Remover avaliação de ${titulo}` }),
  ).toHaveAttribute("aria-pressed", "true");

  // Regra de negocio: ao deixar de ser lido, perde a avaliacao e a data
  await card(page, titulo).getByLabel(`Status de ${titulo}`).selectOption("lendo");
  await expect(page.getByRole("status")).toHaveText(`"${titulo}" agora está em Lendo.`);
  await expect(card(page, titulo).getByRole("button", { name: /Avaliar/ })).toHaveCount(0);

  const [relendo] = await (
    await request.get(`${API_URL}/livros`, { params: { busca: prefixo } })
  ).json();
  expect(relendo).toMatchObject({ status: "lendo", avaliacao: null, concluido_em: null });
});

test("mostra o erro da API ao repetir titulo e autor (409)", async ({ page, request }) => {
  const titulo = `${prefixo} Fundação`;
  await request.post(`${API_URL}/livros`, { data: { titulo, autor: AUTOR } });
  await page.goto("/");

  await adicionarPelaTela(page, titulo.toUpperCase());

  await expect(page.getByRole("alert")).toHaveText(
    `Não foi possível adicionar o livro: Já existe um livro "${titulo.toUpperCase()}" de ${AUTOR}`,
  );
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(titulo.toUpperCase());
});

test("valida o formulario sem chamar a API", async ({ page }) => {
  const envios = [];
  page.on("request", (requisicao) => {
    if (requisicao.method() === "POST") {
      envios.push(requisicao.url());
    }
  });
  await page.goto("/");

  await page.getByRole("button", { name: "Adicionar" }).click();

  await expect(page.getByText("Informe o título.")).toBeVisible();
  await expect(page.getByText("Informe o autor.")).toBeVisible();
  expect(envios).toEqual([]);
});

test("avisa quando a API esta fora do ar e recupera ao tentar de novo", async ({ page }) => {
  // Simula a API inacessivel: toda requisicao para ela falha na rede.
  await page.route(`${API_URL}/**`, (rota) => rota.abort("connectionrefused"));
  await page.goto("/");

  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível carregar os livros: Não foi possível conectar à API.",
  );

  await page.unroute(`${API_URL}/**`);
  await page.getByRole("button", { name: "Tentar novamente" }).click();

  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Resumo da biblioteca")).toBeVisible();
});
