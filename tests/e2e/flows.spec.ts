import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";

test("pilot: three municipalities, filters, case, evidence, supplier, network, export and history", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [name, id] of [
    ["Pimenteiras", "2208106"],
    ["Gilbués", "2204402"],
    ["Milton Brandão", "2206357"],
  ]) {
    await page.goto("/");
    await page.getByRole("textbox", { name: "Buscar município" }).fill(name);
    await page
      .getByRole("button", { name: new RegExp(`^${name}`) })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`m=${id}`));
    await expect(page.locator(".procedure-row").first()).toBeVisible();
  }
  await page.goto("/?m=2208106");
  await page
    .locator(".procedure-row")
    .filter({ hasText: "2025" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Resultados dos itens selecionados" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ivermectina 6 mg", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".item-evidence")
      .filter({
        has: page.getByRole("heading", {
          name: "Ivermectina 6 mg",
          exact: true,
        }),
      }),
  ).toContainText("R$");
  const source = page
    .getByRole("link", { name: "Resultado oficial", exact: true })
    .first();
  expect(await source.getAttribute("href")).toMatch(
    /^https:\/\/pncp.gov.br\/api\/pncp\//,
  );
  const csvResponse = await page.request.get(
    (await page
      .getByRole("link", { name: "CSV da comparação" })
      .first()
      .getAttribute("href"))!,
  );
  expect(csvResponse.ok()).toBeTruthy();
  expect(await csvResponse.text()).toContain(
    "resultado_homologado_nao_pagamento",
  );
  await page.locator(".supplier-link").first().click();
  await expect(page.locator(".supplier-section h2")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Relações documentadas" }),
  ).toBeVisible();
  await page.getByLabel("Profundidade da rede").selectOption("2");
  await expect(page.getByText(/Projeção verificada no Neo4j/)).toBeVisible();
  await page.getByText("Ver nós e relações em tabela").click();
  await expect(page.locator(".node-list li").first()).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Relações documentadas" }),
  ).toBeVisible();
  await expect(page.getByLabel("Profundidade da rede")).toHaveValue("2");
  await page.goBack();
  expect(errors).toEqual([]);
});

test("network has a usable empty state and recovers when filters remove its center", async ({
  page,
}) => {
  await page.goto("/?tab=network");
  await expect(
    page.getByRole("heading", { name: "Escolha o centro da rede" }),
  ).toBeVisible();
  await page.goto("/?m=2204402&supplier=12973088000107&tab=network");
  await expect(page.locator(".network-visual")).toBeVisible();
  await page.getByRole("button", { name: /Limpar filtros/ }).click();
  await expect(
    page.getByRole("tab", { name: "Compras", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Consultando a projeção do Neo4j…")).toHaveCount(
    0,
  );
  await expect(
    page.getByLabel("Filtrar período").locator("option:checked"),
  ).toHaveText("2024–2025");
});

test("map, accessible alternative, year/product filters and honest empty state", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("map-shell")).toHaveAttribute(
    "data-map-ready",
    "true",
  );
  const canvas = page.locator(".map-canvas canvas");
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(page).toHaveURL(/m=22\d{5}/);
  await page.getByRole("tab", { name: "Municípios", exact: true }).click();
  await expect(page.locator(".territory-list>button")).toHaveCount(224);
  await page
    .getByRole("combobox", { name: "Filtrar período" })
    .selectOption("2024");
  await page
    .getByRole("combobox", { name: "Filtrar medicamento" })
    .selectOption("ivermectina-6mg");
  await expect(page).toHaveURL(/y=2024/);
  await expect(page).toHaveURL(/p=ivermectina-6mg/);
  await page.goto("/?m=2200053&y=2025&p=ivermectina-6mg");
  await expect(
    page.getByRole("heading", { name: "Acauã", exact: true }),
  ).toBeVisible();
  const res = await page.request.get(
    "/api/explore?m=2200053&y=2025&p=ivermectina-6mg",
  );
  const data = await res.json();
  if (!data.procedures.length)
    await expect(
      page.getByRole("heading", { name: "Sem registros neste recorte" }),
    ).toBeVisible();
  await page.getByRole("tab", { name: "Comparações" }).click();
  await page
    .getByRole("combobox", { name: "Filtrar indicador" })
    .selectOption("difference");
  await expect(page).toHaveURL(/i=difference/);
});

test("methodology, source provenance, keyboard and accessibility", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Ir para os resultados" }),
  ).toBeFocused();
  await page.getByRole("link", { name: "Metodologia", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "O que os dados permitem afirmar." }),
  ).toBeVisible();
  await expect(
    page.getByText(/5 referências de 3 compradores e 2 fornecedores/),
  ).toBeVisible();
  await page.goto("/fontes");
  await expect(
    page.getByRole("heading", { name: "Manifesto da publicação" }),
  ).toBeVisible();
  await page.goto("/?m=2208106");
  await expect(page.locator(".procedure-row").first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow).toBeFalsy();
});

test("bounded APIs, safe export and response performance budget", async ({
  request,
}) => {
  const timings: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    const response = await request.get("/api/explore?m=2208106");
    expect(response.ok()).toBeTruthy();
    const body = await response.body();
    expect(body.length).toBeLessThan(150000);
    timings.push(Date.now() - start);
  }
  const graph = await (
    await request.get("/api/graph?center=supplier:12973088000107&depth=100")
  ).json();
  expect(graph.verified).toBe(true);
  expect(graph.nodes.length).toBeLessThanOrEqual(100);
  expect(graph.edges.length).toBeLessThanOrEqual(200);
  expect((await request.get("/api/detail?id=unknown")).status()).toBe(404);
  expect((await request.get("/api/supplier?id=bad")).status()).toBe(400);
  const csv = await (await request.get("/api/export?m=2208106")).text();
  expect(csv).not.toMatch(/NEO4J_PASSWORD|CPF|undefined/);
  const sorted = timings.toSorted((a, b) => a - b);
  expect(sorted[2]).toBeLessThan(1000);
  await fs.mkdir("test-results", { recursive: true });
  await fs.writeFile(
    `test-results/performance-${Date.now()}.json`,
    JSON.stringify({
      timingsMs: timings,
      medianMs: sorted[2],
      environment: "local-or-configured-target",
      capturedAt: new Date().toISOString(),
    }),
  );
});
