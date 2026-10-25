import assert from "node:assert/strict";
import path from "node:path";
export async function verifyClaims(page, output) {
  const base = "http://127.0.0.1:14321";
  await page.setViewportSize({ width: 1512, height: 1050 });
  await page.goto(base + "/admin/reclamaciones");
  await page.getByRole("link", { name: "REC-0001", exact: true }).waitFor();
  await page.screenshot({
    path: path.join(output, "reclamos-tabla-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: path.join(output, "reclamos-tabla-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1512, height: 1050 });
  await page.getByRole("link", { name: "REC-0001", exact: true }).click();
  await page
    .locator("#claim-status")
    .filter({ hasText: "En proceso" })
    .waitFor();
  await page.screenshot({
    path: path.join(output, "reclamo-ficha-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: path.join(output, "reclamo-ficha-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1512, height: 1050 });
  const customer = await page.context().newPage();
  await customer.clock.install();
  await customer.goto(base + "/consultar-solicitud?ref=NID-1234567890ABCDEF");
  await customer
    .getByLabel("Correo registrado", { exact: true })
    .fill("consumer@example.invalid");
  await customer
    .getByRole("button", { name: "Consultar estado", exact: true })
    .click();
  await customer
    .locator('.claim-progress li[aria-current="step"]')
    .filter({ hasText: "En revisión" })
    .waitFor();
  await customer.screenshot({
    path: path.join(output, "reclamo-cliente-revision.png"),
    fullPage: true,
  });
  await page
    .locator('#claim-management-form [name="status"]')
    .selectOption("answered");
  await page.locator('[name="outcome"]').selectOption("resolved");
  await page
    .locator('[name="response"]')
    .fill(
      "Hemos revisado tu solicitud y coordinado una solución con nuestro equipo.",
    );
  await page
    .getByRole("button", { name: "Guardar gestión", exact: true })
    .click();
  await page.locator("#claim-status").filter({ hasText: "Resuelto" }).waitFor();
  await customer.clock.fastForward(31000);
  await customer
    .getByText(
      "Hemos revisado tu solicitud y coordinado una solución con nuestro equipo.",
      { exact: true },
    )
    .waitFor();
  await customer
    .locator('.claim-progress li[aria-current="step"]')
    .filter({ hasText: "Resultado" })
    .waitFor();
  await customer.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await customer.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await customer.screenshot({
    path: path.join(output, "reclamo-cliente-resultado-mobile.png"),
    fullPage: true,
  });
  await customer.close();
  await page.goto(base + "/admin/reclamaciones");
  await page
    .locator("tr")
    .filter({ hasText: "REC-0001" })
    .getByText("Resuelto", { exact: true })
    .waitFor();
}
