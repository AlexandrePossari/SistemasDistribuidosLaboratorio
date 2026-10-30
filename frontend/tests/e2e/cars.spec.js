import { expect, test } from "@playwright/test";

// Fluxo completo do usuario no navegador real (Chromium), com o app servido pelo Vite.

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("exibe a pagina com os carros de exemplo", async ({ page }) => {
  await expect(page).toHaveTitle("Gerenciador de Carros");
  await expect(page.getByRole("heading", { name: "Gerenciador de Carros" })).toBeVisible();

  const lista = page.getByRole("list", { name: "Carros cadastrados" });
  await expect(lista.getByRole("listitem")).toHaveCount(2);
  await expect(lista).toContainText("Toyota Corolla");
  await expect(lista).toContainText("Honda Civic");
});

test("cadastra, filtra e remove um carro", async ({ page }) => {
  // exact: true evita casar com "Filtrar por marca" ou com os botoes "Remover Toyota Corolla".
  await page.getByLabel("Marca", { exact: true }).fill("Chevrolet");
  await page.getByLabel("Modelo", { exact: true }).fill("Onix");
  await page.getByLabel("Ano", { exact: true }).fill("2023");
  await page.getByLabel("Cor", { exact: true }).fill("Vermelho");
  await page.getByLabel("Preço (R$)", { exact: true }).fill("95000");
  await page.getByRole("button", { name: "Cadastrar" }).click();

  const lista = page.getByRole("list", { name: "Carros cadastrados" });
  await expect(lista.getByRole("listitem")).toHaveCount(3);
  await expect(lista).toContainText("Chevrolet Onix");
  await expect(lista).toContainText("R$ 95.000,00");

  await page.getByLabel("Filtrar por marca").fill("chev");
  await expect(lista.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByTestId("contador-carros")).toHaveText("1 de 3");

  await page.getByRole("button", { name: "Remover Chevrolet Onix" }).click();
  await expect(page.getByText("Nenhum carro encontrado.")).toBeVisible();
  await expect(page.getByTestId("contador-carros")).toHaveText("0 de 2");
});

test("mostra erros ao enviar o formulario vazio", async ({ page }) => {
  await page.getByRole("button", { name: "Cadastrar" }).click();

  await expect(page.getByRole("alert")).toHaveCount(5);
  await expect(page.getByText("Marca é obrigatória.")).toBeVisible();
  await expect(page.getByText("Preço é obrigatório.")).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Carros cadastrados" }).getByRole("listitem"),
  ).toHaveCount(2);
});
