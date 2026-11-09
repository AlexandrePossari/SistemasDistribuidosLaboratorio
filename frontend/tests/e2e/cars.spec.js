import { expect, test } from "@playwright/test";

// Fluxo completo no navegador real (Chromium) usando a stack inteira:
// React (Vite) -> FastAPI -> PostgreSQL. Nada e mockado, exceto no teste da API fora do ar.
//
// O banco pode ter outros carros (dados de desenvolvimento), entao cada teste usa uma
// marca unica, filtra a lista por ela e apaga pela API o que cadastrou.

const API_URL = (process.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

let marca;

test.beforeEach(() => {
  const sufixo = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  marca = `E2E-${test.info().workerIndex}-${sufixo}`;
});

test.afterEach(async ({ request }) => {
  const resposta = await request.get(`${API_URL}/cars`, { params: { marca, limite: 100 } });
  for (const carro of await resposta.json()) {
    await request.delete(`${API_URL}/cars/${carro.id}`);
  }
});

function carroDeTeste(dados = {}) {
  return { marca, modelo: "Onix", ano: 2023, cor: "Vermelho", preco: 95000, ...dados };
}

async function preencherFormulario(page, carro) {
  // exact: true evita casar com "Filtrar por marca" ou com botoes como "Editar Toyota Corolla".
  await page.getByLabel("Marca", { exact: true }).fill(carro.marca);
  await page.getByLabel("Modelo", { exact: true }).fill(carro.modelo);
  await page.getByLabel("Ano", { exact: true }).fill(String(carro.ano));
  await page.getByLabel("Cor", { exact: true }).fill(carro.cor);
  await page.getByLabel("Preço (R$)", { exact: true }).fill(String(carro.preco));
}

async function filtrarPelaMarca(page) {
  await page.getByLabel("Filtrar por marca").fill(marca);
  await page.getByRole("button", { name: "Buscar" }).click();
}

function lista(page) {
  return page.getByRole("list", { name: "Carros cadastrados" });
}

test("carrega a pagina e a lista de carros da API", async ({ page }) => {
  const respostaLista = page.waitForResponse(
    (resposta) => resposta.url().startsWith(`${API_URL}/cars`) && resposta.status() === 200,
  );

  await page.goto("/");

  await respostaLista;
  await expect(page).toHaveTitle("Gerenciador de Carros");
  await expect(page.getByRole("heading", { name: "Gerenciador de Carros" })).toBeVisible();
  await expect(page.getByTestId("contador-carros")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("cadastra, edita, altera o preco e remove um carro (CRUD completo)", async ({ page }) => {
  const nome = `${marca} Onix`;
  await page.goto("/");

  // POST
  await preencherFormulario(page, carroDeTeste());
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByRole("status")).toHaveText(`${nome} cadastrado.`);

  // GET com filtro por marca
  await filtrarPelaMarca(page);
  await expect(lista(page).getByRole("listitem")).toHaveCount(1);
  await expect(lista(page)).toContainText("2023 · Vermelho · R$ 95.000,00");

  // GET por id + PUT
  await page.getByRole("button", { name: `Editar ${nome}` }).click();
  const formulario = page.getByRole("form", { name: `Editar ${nome}` });
  await expect(formulario.getByLabel("Cor", { exact: true })).toHaveValue("Vermelho");
  await formulario.getByLabel("Cor", { exact: true }).fill("Branco");
  await formulario.getByLabel("Ano", { exact: true }).fill("2024");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("status")).toHaveText(`${nome} atualizado.`);
  await expect(lista(page)).toContainText("2024 · Branco · R$ 95.000,00");

  // PATCH
  await page.getByRole("button", { name: `Alterar preço de ${nome}` }).click();
  await page.getByLabel("Novo preço (R$)").fill("89900.5");
  await page.getByRole("button", { name: "Salvar preço" }).click();
  await expect(page.getByRole("status")).toHaveText(`Preço de ${nome} alterado para R$ 89.900,50.`);
  await expect(lista(page)).toContainText("R$ 89.900,50");

  // DELETE
  await page.getByRole("button", { name: `Remover ${nome}` }).click();
  await expect(page.getByRole("status")).toHaveText(`${nome} removido.`);
  await expect(page.getByText("Nenhum carro encontrado.")).toBeVisible();
});

test("mantem o carro no banco depois de recarregar a pagina", async ({ page, request }) => {
  await page.goto("/");
  await preencherFormulario(page, carroDeTeste({ modelo: "Tracker", preco: 140000 }));
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByRole("status")).toHaveText(`${marca} Tracker cadastrado.`);

  await page.reload();
  await filtrarPelaMarca(page);

  await expect(lista(page).getByRole("listitem")).toHaveCount(1);
  await expect(lista(page)).toContainText(`${marca} Tracker`);

  const resposta = await request.get(`${API_URL}/cars`, { params: { marca } });
  expect(await resposta.json()).toEqual([
    expect.objectContaining({ marca, modelo: "Tracker", preco: 140000 }),
  ]);
});

test("mostra o erro devolvido pela API (404) e atualiza a lista", async ({ page, request }) => {
  const criado = await request.post(`${API_URL}/cars`, { data: carroDeTeste({ modelo: "Mobi" }) });
  const carro = await criado.json();
  await page.goto("/");
  await filtrarPelaMarca(page);
  await expect(lista(page).getByRole("listitem")).toHaveCount(1);

  // Outro cliente remove o carro enquanto ele ainda aparece na tela.
  await request.delete(`${API_URL}/cars/${carro.id}`);
  await page.getByRole("button", { name: `Remover ${marca} Mobi` }).click();

  await expect(page.getByRole("alert")).toHaveText(
    `Não foi possível remover o carro: Carro ${carro.id} nao encontrado`,
  );
  await expect(page.getByText("Nenhum carro encontrado.")).toBeVisible();
});

test("valida o formulario sem chamar a API", async ({ page }) => {
  const envios = [];
  page.on("request", (requisicao) => {
    if (requisicao.method() === "POST") {
      envios.push(requisicao.url());
    }
  });
  await page.goto("/");

  await page.getByRole("button", { name: "Cadastrar" }).click();

  await expect(page.getByRole("form", { name: "Cadastrar carro" }).getByRole("alert")).toHaveCount(
    5,
  );
  await expect(page.getByText("Marca é obrigatória.")).toBeVisible();
  expect(envios).toEqual([]);
});

test("avisa quando a API esta fora do ar", async ({ page }) => {
  // Simula a API inacessivel: toda requisicao para ela falha na rede.
  await page.route(`${API_URL}/**`, (rota) => rota.abort("connectionrefused"));
  await page.goto("/");

  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível carregar os carros: Não foi possível conectar à API.",
  );
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();

  // Quando a API volta, "Tentar novamente" carrega a lista.
  await page.unroute(`${API_URL}/**`);
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByTestId("contador-carros")).toBeVisible();
});
