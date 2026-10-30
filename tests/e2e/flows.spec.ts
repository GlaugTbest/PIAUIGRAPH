import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";

test("ordinary search works for the three pilot municipalities, detail, comparison, supplier and links", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const city of ["Pimenteiras", "Gilbués", "Milton Brandão"]) {
    await page.goto("/");
    await page
      .getByRole("textbox", {
        name: "Buscar compras, serviços ou fornecedores",
      })
      .fill(city);
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page).toHaveURL(/q=/);
    await expect(page.locator(".purchase-row").first()).toContainText(city);
  }
  await page.goto("/?q=06554893000101-1-000001%2F2025");
  await page.locator(".purchase-row").first().click();
  await expect(page.locator(".record-title")).toBeVisible();
  await expect(page.locator(".value-comparison")).toContainText("Previsto");
  await expect(
    page.getByRole("link", { name: "Abrir fonte oficial" }),
  ).toHaveAttribute("href", /^https:\/\/pncp.gov.br\/app\/editais\//);
  await expect(
    page.getByRole("heading", { name: "Preços de itens comparáveis" }),
  ).toBeVisible();
  const csv = await page.request.get(
    (await page
      .getByRole("link", { name: "CSV da comparação" })
      .first()
      .getAttribute("href"))!,
  );
  expect(csv.ok()).toBeTruthy();
  expect(await csv.text()).toContain("resultado_homologado_nao_pagamento");
  await page.locator(".medicine-comparison .entity-link").first().click();
  await expect(page.locator(".network-node").first()).toBeVisible();
  await page.getByLabel("Alcance das ligações").selectOption("1");
  await expect(page).toHaveURL(/depth=1/);
  await page.reload();
  await expect(page.locator(".network-node").first()).toBeVisible();
  await page.getByText("Ver os registros em lista", { exact: true }).click();
  await expect(page.locator(".node-list li").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("filters, pagination, direct URL and recovery keep the catalog usable", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await expect(page.locator(".purchase-row").first()).toBeVisible();
  const all = await (await page.request.get("/api/catalog")).json();
  if (all.pages > 1) {
    await page.getByRole("button", { name: "Próxima", exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator(".pagination>span")).toHaveText(
      `Página 2 de ${all.pages.toLocaleString("pt-BR")}`,
    );
    await page.getByRole("button", { name: "Anterior", exact: true }).click();
  }
  if (isMobile) await page.getByRole("button", { name: /^Filtrar/ }).click();
  await page.getByLabel("Filtrar município").selectOption("2204402");
  await page.getByLabel("Filtrar ano").selectOption("2025");
  await page.getByLabel("Filtrar assunto").selectOption("saude");
  await expect(page).toHaveURL(/m=2204402/);
  await expect(page).toHaveURL(/y=2025/);
  await expect(page.locator(".purchase-row").first()).toContainText("Gilbués");
  await page.reload();
  if (isMobile) await page.getByRole("button", { name: /^Filtrar/ }).click();
  await expect(page.getByLabel("Filtrar município")).toHaveValue("2204402");
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page.getByLabel("Filtrar município")).toHaveValue("");
  await page.goto("/?q=zzzzzznenhumregistro");
  await expect(
    page.getByRole("heading", { name: "Nenhum registro com estes filtros." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Apagar busca" }).click();
  await expect(page.locator(".purchase-row").first()).toBeVisible();
});

test("all subjects, official contracts and financial questions are navigable", async ({
  page,
}) => {
  await page.goto("/?tab=insights");
  await expect(
    page.getByRole("heading", { name: "Por onde começar a conferir?" }),
  ).toBeVisible();
  await page.getByLabel("Medida do gráfico de assuntos").selectOption("count");
  await expect(page.locator(".topics-chart>button").first()).toBeVisible();
  const catalog = await (await page.request.get("/api/catalog")).json();
  if (catalog.coverage.broad) {
    for (const q of ["pavimentação", "serviços", "combustíveis"]) {
      const response = await (
        await page.request.get(`/api/catalog?q=${encodeURIComponent(q)}`)
      ).json();
      expect(response.total).toBeGreaterThan(0);
    }
    expect(catalog.modes.some((m: { id: number }) => m.id === 8)).toBeTruthy();
  }
  const contracts = await (
    await page.request.get("/api/catalog?kind=contracts")
  ).json();
  await page.getByRole("tab", { name: /^Contratos/ }).click();
  if (contracts.total) {
    await page.locator(".purchase-row").first().click();
    await expect(page.locator(".contract-values")).toContainText(
      "Valor global publicado",
    );
    await expect(
      page.getByRole("link", { name: "Abrir fonte oficial" }),
    ).toHaveAttribute("href", /^https:\/\/pncp.gov.br\/app\/contratos\//);
    const first = contracts.rows[0];
    if (first.supplierId) {
      await page.locator(".record-facts .entity-link").click();
      await expect(page.locator(".network-node.is-center")).toBeVisible();
      const company = await (
        await page.request.get(`/api/company?id=${first.supplierId}`)
      ).json();
      expect(company.totalContracts).toBeGreaterThan(0);
      expect(
        company.contracts.some((c: { id: string }) => c.id === first.id),
      ).toBeTruthy();
    }
  } else
    await expect(
      page.getByRole("heading", { name: "Nenhum registro com estes filtros." }),
    ).toBeVisible();
});

test("map and its complete list offer equivalent municipality selection", async ({
  page,
}) => {
  await page.goto("/?tab=map");
  await expect(page.getByTestId("map-shell")).toHaveAttribute(
    "data-map-ready",
    "true",
  );
  const canvas = page.locator(".large-map canvas");
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(page).toHaveURL(/m=22\d{5}/);
  await page.goto("/?tab=map");
  await page
    .getByText("Escolher município pela lista", { exact: true })
    .click();
  await expect(page.locator(".municipality-list button")).toHaveCount(224);
  await page
    .locator(".municipality-list button")
    .filter({ hasText: "Gilbués" })
    .click();
  await expect(page).toHaveURL(/m=2204402/);
  await expect(page.locator(".purchase-row").first()).toContainText("Gilbués");
});

test("official item loading recovers from source failure; success fixture is a captured PNCP record", async ({
  page,
}) => {
  const fixture = JSON.parse(
    await fs.readFile("tests/fixtures/official-gilbues-items.json", "utf8"),
  );
  let fail = true;
  await page.route("**/api/items?**", (route) =>
    route.fulfill({
      status: fail ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        fail
          ? {
              error:
                "O PNCP não respondeu agora. Tente novamente ou abra a fonte oficial.",
            }
          : fixture,
      ),
    }),
  );
  await page.goto("/?case=06554216000185-1-000001%2F2025");
  await page
    .getByRole("button", { name: "Itens e preços desta compra" })
    .click();
  await expect(page.locator(".items-content").getByRole("alert")).toContainText(
    "PNCP não respondeu",
  );
  fail = false;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.locator(".official-item").first()).toContainText(
    fixture.rows[0].description,
  );
  await expect(
    page.getByRole("link", { name: "Itens na fonte oficial" }),
  ).toHaveAttribute("href", fixture.source.url);
});

test("reading guidance, keyboard and accessibility stay clear on search and details", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".purchase-row").first()).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Ir para os resultados" }),
  ).toBeFocused();
  for (const url of ["/", "/?case=06554893000101-1-000001%2F2025"]) {
    await page.goto(url);
    if (url !== "/") await expect(page.locator(".record-title")).toBeVisible();
    else await expect(page.locator(".purchase-row").first()).toBeVisible();
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(axe.violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
    ).toBeFalsy();
  }
  await page.goto("/metodologia");
  await expect(
    page.getByRole("heading", {
      name: "Entenda o valor antes de tirar uma conclusão.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("5 referências de 3 compradores e 2 fornecedores", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/fontes");
  await expect(
    page.getByRole("heading", { name: "Manifesto da publicação" }),
  ).toBeVisible();
});

test("bounded APIs, actual sources, safe CSV and warm response budget", async ({
  request,
}) => {
  const timings: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    const r = await request.get("/api/catalog?m=2208106");
    expect(r.ok()).toBeTruthy();
    expect((await r.body()).length).toBeLessThan(500000);
    timings.push(Date.now() - start);
  }
  expect(timings.toSorted((a, b) => a - b)[2]).toBeLessThan(1500);
  expect((await request.get("/api/record?id=unknown")).status()).toBe(404);
  expect((await request.get("/api/company?id=bad")).status()).toBe(400);
  const g = await (
    await request.get("/api/graph?center=supplier:12973088000107&depth=200")
  ).json();
  expect(g.verified).toBe(true);
  expect(g.nodes.length).toBeLessThanOrEqual(100);
  expect(g.edges.length).toBeLessThanOrEqual(200);
  const csv = await (await request.get("/api/catalog-export?m=2208106")).text();
  expect(csv).toContain("licitacao_nao_pagamento");
  expect(csv).not.toMatch(/NEO4J_PASSWORD|undefined/);
  await fs.mkdir("test-results", { recursive: true });
  await fs.writeFile(
    `test-results/civic-performance-${Date.now()}.json`,
    JSON.stringify({
      timings,
      medianMs: timings.toSorted((a, b) => a - b)[2],
      capturedAt: new Date().toISOString(),
    }),
  );
});
