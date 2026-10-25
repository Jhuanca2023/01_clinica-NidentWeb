import assert from "node:assert/strict";
import path from "node:path";
export async function verifyOperations(page, output) {
  const base = "http://127.0.0.1:14321";
  await page.goto(base + "/admin/productos");
  await page
    .getByRole("button", { name: "Nuevo producto", exact: true })
    .click();
  await page.locator('[name="title"]').fill("Producto añadido desde el panel");
  await page
    .locator('[name="summary"]')
    .fill("Descripción del producto creado en la verificación.");
  await page.locator('[name="price"]').fill("49.90");
  await page.locator('[name="category"]').fill("Higiene");
  await page.locator('[name="stock"]').fill("3");
  await page.locator("#collection-save").click();
  await page
    .getByText("Borrador guardado. La colección publicada sigue vigente.")
    .waitFor();
  await page.locator("#collection-publish").click();
  await page
    .locator("#collection-feedback")
    .filter({ hasText: "publicad" })
    .waitFor();
  await page.screenshot({
    path: path.join(output, "productos-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Catálogo móvil sin desbordamiento",
  );
  await page.screenshot({
    path: path.join(output, "productos-mobile.png"),
    fullPage: true,
  });
  await page.goto(base + "/tienda");
  await page
    .getByRole("heading", {
      name: "Producto añadido desde el panel",
      exact: true,
    })
    .waitFor();
  await page
    .locator(".product-card")
    .filter({ hasText: "Producto añadido desde el panel" })
    .getByRole("link", { name: "Ver producto" })
    .click();
  await page
    .getByRole("heading", {
      name: "Producto añadido desde el panel",
      exact: true,
    })
    .waitFor();
  await page.getByRole("link", { name: "Consultar este producto" }).click();
  await page.waitForFunction(() =>
    document
      .querySelector('[name="mensaje"]')
      ?.value.includes("Producto añadido desde el panel"),
  );
  await page.setViewportSize({ width: 1512, height: 1050 });
  await page.goto(base + "/admin/usuarios");
  await page.locator('#security-form [name="name"]').fill("Personal de prueba");
  await page
    .locator('#security-form [name="email"]')
    .fill("staff@example.invalid");
  await page
    .locator('#security-form [name="password"]')
    .fill("SyntheticOnly2026");
  await page
    .locator('#security-form [name="password_confirmation"]')
    .fill("SyntheticOnly2026");
  await page.locator('[name="profile_ids"]').check();
  await page
    .getByRole("button", { name: "Crear usuario", exact: true })
    .click();
  await page
    .locator("#security-list")
    .getByText("Personal de prueba", { exact: true })
    .waitFor();
  await page.screenshot({
    path: path.join(output, "usuarios-desktop.png"),
    fullPage: true,
  });
  for (const route of ["usuarios", "perfiles", "roles", "reclamaciones"]) {
    await page.goto(base + "/admin/" + route);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      route + " móvil sin desbordamiento",
    );
    await page.screenshot({
      path: path.join(output, route + "-mobile.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1512, height: 1050 });
  }
  await page.goto(base + "/consultar-solicitud?ref=NID-1234567890ABCDEF");
  await page
    .getByLabel("Correo registrado", { exact: true })
    .fill("lookup@example.invalid");
  await page
    .getByRole("button", { name: "Consultar estado", exact: true })
    .click();
  await page.locator("#lookup-result").waitFor({ state: "visible" });
  await page.goto(base + "/libro-reclamaciones");
  const fields = {
    name: "Consumidor de prueba",
    email: "claim@example.invalid",
    document_number: "00000000",
    phone: "999000000",
    address: "Dirección de prueba",
    service: "Evaluación dental",
    detail:
      "Descripción sintética de una reclamación para probar el formulario.",
    requested_solution: "Revisar la atención recibida.",
  };
  for (const name of ["name", "email", "document_number", "phone"])
    await page
      .locator('#claim-public-form [name="' + name + '"]')
      .fill(fields[name]);
  await page.screenshot({
    path: path.join(output, "libro-paso-personal-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(output, "libro-paso-personal-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1512, height: 1050 });
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  for (const [name, value] of Object.entries({
    department: "La Libertad",
    province: "Trujillo",
    district: "Trujillo",
    address: fields.address,
  }))
    await page.locator('#claim-public-form [name="' + name + '"]').fill(value);
  await page.getByRole("button", { name: "Volver", exact: true }).click();
  assert.equal(
    await page.locator('#claim-public-form [name="name"]').inputValue(),
    fields.name,
  );
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  for (const name of ["service", "detail", "requested_solution"])
    await page
      .locator('#claim-public-form [name="' + name + '"]')
      .fill(fields[name]);
  await page.locator('#claim-public-form [name="privacy"]').check();
  await page
    .getByRole("button", { name: "Registrar solicitud", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Constancia de tu solicitud" })
    .waitFor();
  await page.screenshot({
    path: path.join(output, "reclamacion-constancia.png"),
    fullPage: true,
  });
}
