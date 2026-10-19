import assert from "node:assert/strict";
import path from "node:path";
export async function verifyModules(page, output) {
  const base = "http://127.0.0.1:14321";
  await page
    .getByRole("heading", { name: "Así va Nident.", exact: true })
    .waitFor();
  await page.locator(".activity-chart svg").waitFor();
  await page.screenshot({
    path: path.join(output, "dashboard-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(output, "dashboard-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Dashboard móvil sin overflow",
  );
  await page.setViewportSize({ width: 1512, height: 1050 });
  await page.goto(base + "/admin/sliders");
  const original = await page.locator(".slide-thumbnail").count();
  await page.locator("#slide-remove").click();
  await page
    .getByRole("dialog", { name: "Eliminar slider", exact: true })
    .waitFor();
  await page.screenshot({
    path: path.join(output, "confirmacion-eliminar.png"),
    fullPage: false,
  });
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.equal(await page.locator(".slide-thumbnail").count(), original);
  await page.locator("#slide-remove").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar slider", exact: true })
    .click();
  assert.equal(await page.locator(".slide-thumbnail").count(), original - 1);
  await page.locator('a[href="/admin/resenas"]').first().click();
  await page
    .getByRole("dialog", { name: "Tienes cambios sin guardar" })
    .waitFor();
  await page
    .getByRole("button", { name: "Seguir editando", exact: true })
    .click();
  assert.equal(new URL(page.url()).pathname, "/admin/sliders");
  await page.locator('a[href="/admin/resenas"]').first().click();
  await page
    .getByRole("button", { name: "Salir sin guardar", exact: true })
    .click();
  await page.waitForURL("**/admin/resenas");
  await page.getByRole("button", { name: "Nueva reseña", exact: true }).click();
  await page.locator('#collection-fields [name="author"]').fill("Persona QA");
  await page
    .locator('#collection-fields [name="quote"]')
    .fill("Reseña creada desde el módulo completo.");
  await page
    .locator('#collection-fields [name="service"]')
    .fill("Evaluación sintética");
  await page.locator('#collection-fields [name="rating"]').fill("4");
  await page.evaluate(() => history.back());
  await page
    .getByRole("dialog", { name: "Tienes cambios sin guardar" })
    .waitFor();
  await page
    .getByRole("button", { name: "Seguir editando", exact: true })
    .click();
  await page.reload();
  await page
    .getByText("Recuperamos los cambios sin guardar de esta pestaña.", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.locator('#collection-fields [name="quote"]').inputValue(),
    "Reseña creada desde el módulo completo.",
  );
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await page
    .getByText("Borrador guardado. La colección publicada sigue vigente.", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    (await (await page.request.get(base + "/")).text()).includes(
      "Reseña creada desde el módulo completo.",
    ),
    false,
    "Borrador de reseña privado",
  );
  await page
    .getByRole("button", { name: "Publicar colección", exact: true })
    .click();
  await page
    .getByText(
      "Colección publicada. Los cambios ya están disponibles en el sitio.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    (await (await page.request.get(base + "/")).text()).includes(
      "Reseña creada desde el módulo completo.",
    ),
    true,
    "Reseña publicada en web",
  );
  await page.screenshot({
    path: path.join(output, "resenas-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(output, "resenas-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Reseñas móvil sin overflow",
  );
  await page.setViewportSize({ width: 1512, height: 1050 });
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar", exact: true })
    .click();
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  assert.equal(
    await page.locator('#collection-fields [name="author"]').inputValue(),
    "Persona QA",
  );
  await page
    .getByRole("button", { name: "Publicar colección", exact: true })
    .click();
  await page
    .getByText(
      "Colección publicada. Los cambios ya están disponibles en el sitio.",
      { exact: true },
    )
    .waitFor();
  await page.goto(base + "/admin/planes");
  await page.getByRole("button", { name: "Nuevo plan", exact: true }).click();
  await page
    .locator('#collection-fields [name="title"]')
    .fill("Plan personalizado QA");
  await page
    .locator('#collection-fields [name="summary"]')
    .fill("Un plan con inclusiones y secciones propias.");
  await page
    .locator('#collection-fields [name="price"]')
    .fill("Consultar precio");
  await page
    .locator('#collection-fields [name="features"]')
    .fill("Primera inclusión\nOtra inclusión propia");
  await page
    .locator('#collection-fields [name="conditions"]')
    .fill("Condición específica del plan de prueba.");
  await page
    .getByRole("button", {
      name: "Agregar sección de información",
      exact: true,
    })
    .click();
  await page
    .locator("#collection-fields fieldset input")
    .nth(0)
    .fill("Cómo funciona");
  await page
    .locator("#collection-fields fieldset textarea")
    .nth(0)
    .fill("Información propia del nuevo plan.");
  await page
    .getByRole("button", {
      name: "Agregar sección de información",
      exact: true,
    })
    .click();
  await page
    .locator("#collection-fields fieldset input")
    .nth(1)
    .fill("Antes de tu visita");
  await page
    .locator("#collection-fields fieldset textarea")
    .nth(1)
    .fill("Otra sección que no depende de los planes existentes.");
  await page
    .getByRole("button", { name: "Publicar colección", exact: true })
    .click();
  await page
    .getByText(
      "Colección publicada. Los cambios ya están disponibles en el sitio.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await page
      .locator('#collection-fields [name="slug"]')
      .getAttribute("readonly"),
    "",
    "La dirección publicada queda protegida",
  );
  await page.screenshot({
    path: path.join(output, "planes-desktop.png"),
    fullPage: true,
  });
  const detail = await page.request.get(base + "/planes/plan-personalizado-qa");
  assert.equal(detail.status(), 200);
  const text = await detail.text();
  assert.ok(text.includes("Información propia del nuevo plan."));
  assert.ok(
    text.includes("Otra sección que no depende de los planes existentes."),
  );
  await page.goto(base + "/reservar?plan=plan-personalizado-qa");
  assert.equal(
    await page.locator('select[name="treatment"]').inputValue(),
    "Plan personalizado QA",
    "Reserva conserva el plan elegido",
  );
  await page.goto(base + "/admin/planes?plan=plan-personalizado-qa");
  await page.locator('#collection-fields [name="visible"]').uncheck();
  await page
    .getByRole("button", { name: "Publicar colección", exact: true })
    .click();
  await page
    .getByText(
      "Colección publicada. Los cambios ya están disponibles en el sitio.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    (await page.request.get(base + "/planes/plan-personalizado-qa")).status(),
    404,
    "Plan oculto no accesible por URL",
  );
  await page.goto(base + "/admin");
}
