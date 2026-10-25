// Visual integration fixture only: no database connection, no real account, no email transport.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { verifyOperations } from "./verify-operations.mjs";
import { verifyModules } from "./verify-modules.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("../../", import.meta.url));
const output = path.join(root, ".runtime/screenshots");
fs.mkdirSync(output, { recursive: true });
const seed = JSON.parse(
  fs.readFileSync(
    path.join(root, "Backend-nident/database/seeders/data/nident-site.json"),
    "utf8",
  ),
);
const schemas = JSON.parse(
  fs.readFileSync(
    path.join(root, "Backend-nident/database/seeders/data/nident-canvas.json"),
    "utf8",
  ),
);
const modules = Object.keys(schemas).map((key) => ({
  key,
  draft: {},
  published: {},
  version: 1,
}));
let siteVersion = 1;
const collectionSeed = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "Backend-nident/database/seeders/data/nident-collections.json",
    ),
    "utf8",
  ),
);
const collections = Object.fromEntries(
  Object.entries(collectionSeed).map(([key, seed]) => [
    key,
    {
      key,
      version: 1,
      draft: { items: structuredClone(seed.items) },
      published: { items: structuredClone(seed.items) },
    },
  ]),
);
collections.products = {
  key: "products",
  version: 1,
  draft: {
    items: JSON.parse(
      fs.readFileSync(
        path.join(
          root,
          "Backend-nident/database/seeders/data/nident-products.json",
        ),
        "utf8",
      ),
    ),
  },
  published: {
    items: JSON.parse(
      fs.readFileSync(
        path.join(
          root,
          "Backend-nident/database/seeders/data/nident-products.json",
        ),
        "utf8",
      ),
    ),
  },
};
let mailBranding = {
  version: 1,
  branding: {
    name: "Nident",
    logo: "/email-assets/nident-logo.png",
    logo_alt: "Nident · Odontología",
    banner: "/email-assets/nident-banner.jpg",
    banner_alt: "Un espacio para cuidar tu sonrisa",
    tagline: "Sonríe a tu manera. Te acompañamos.",
    footer_title: "Estamos para ayudarte.",
    footer_text:
      "Si tienes alguna consulta sobre esta comunicación, contacta al equipo de Nident.",
    address: "",
    phone: "",
    email: "",
    website: "",
    links: [],
  },
};
const renderEmail = (document, branding) =>
  JSON.parse(
    execFileSync(
      "php",
      [
        path.join(
          root,
          "Backend-nident/scripts/nident-render-email-fixture.php",
        ),
      ],
      {
        cwd: path.join(root, "Backend-nident"),
        input: JSON.stringify({ document, branding }),
        encoding: "utf8",
      },
    ),
  );
const business = {
  commercial_name: "Nident",
  legal_name: "Clínica sintética",
  tax_id: "00000000000",
  address: "Dirección de prueba",
  email: "fixture@example.invalid",
  version: 1,
};
const security = {
  users: [],
  profiles: [
    {
      id: 1,
      name: "Recepción de prueba",
      active: true,
      version: 1,
      role_ids: [1],
    },
  ],
  roles: [
    {
      id: 1,
      name: "Atención",
      active: true,
      version: 1,
      require_2fa: false,
      permissions: ["reservations", "attention"],
    },
  ],
  areas: {
    reservations: "Reservas",
    attention: "Mensajes",
    claims: "Reclamaciones",
    catalog: "Productos",
    site: "Contenido",
    mail: "Correos",
  },
};
const block = (type, text) => ({ type, text, url: "", alt: "" });
let template = {
  id: 1,
  key: "contact_received",
  name: "Recepción de contacto",
  variables: ["nombre"],
  version: 1,
  published_version: null,
  draft: {
    subject: "Recibimos tu mensaje · Nident",
    preheader: "Gracias por escribirnos",
    accent: "#7258b6",
    footer: "Vista de prueba con datos sintéticos. No se envía ningún correo.",
    blocks: [
      block("heading", "Gracias por escribirnos."),
      block(
        "text",
        "Hola {{nombre}}, recibimos tu mensaje. Nuestro equipo lo revisará para responderte por el canal indicado.",
      ),
      block("divider", ""),
      block("text", "Sonríe a tu manera. Te acompañamos."),
    ],
  },
};
const fixture = http.createServer(async (request, response) => {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  let body = {};
  try {
    body = JSON.parse(raw || "{}");
  } catch {}
  response.setHeader("Content-Type", "application/json");
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  let result;
  if (pathname.endsWith("/auth/login")) {
    response.end(
      JSON.stringify({
        token: "synthetic-visual-fixture-not-a-real-jwt",
        refreshToken: "synthetic-visual-fixture",
      }),
    );
    return;
  }
  if (pathname.endsWith("/public/contact")) {
    response.statusCode = 201;
    response.end(
      JSON.stringify({
        success: true,
        result: { reference: "NID-VISUAL-TEST" },
      }),
    );
    return;
  }
  if (pathname.endsWith("/public/reservations")) {
    response.statusCode = 201;
    response.end(
      JSON.stringify({
        result: { code: "NID-VISUAL-RESERVA" },
        message:
          "Recibimos tu solicitud. La clínica confirmará la disponibilidad.",
      }),
    );
    return;
  }
  if (pathname.endsWith("/public/products")) {
    response.end(
      JSON.stringify(
        collections.products.published.items
          .filter((p) => p.visible)
          .map((p) => ({ ...p, name: p.title })),
      ),
    );
    return;
  }
  if (pathname.endsWith("/public/requests/lookup"))
    result = {
      type: "contact",
      reference: body.reference,
      status: "received",
      registered_at: new Date().toISOString(),
      notification: { status: "sent", sandbox: true },
    };
  else if (pathname.endsWith("/public/claims")) {
    response.statusCode = 201;
    result = {
      reference: "NID-1234567890ABCDEF",
      sheet_number: "000001",
      registered_at: new Date().toISOString(),
      notification: { status: "sent", sandbox: true },
    };
  } else if (pathname.endsWith("/claims/settings")) result = business;
  else if (pathname.endsWith("/admin/claims"))
    result = { data: [], total: 0, current_page: 1, last_page: 1 };
  else if (pathname.endsWith("/mail/health"))
    result = {
      enabled: true,
      sandbox: true,
      transport: "smtp",
      queued: 0,
      failed: 0,
      flows: [
        { key: "contact_received", name: "Acuse de contacto", published: true },
      ],
    };
  else if (pathname.endsWith("/admin/security")) result = security;
  else if (/security\/(users|profiles|roles)(?:\/\d+)?$/.test(pathname)) {
    const type = pathname.match(/security\/(users|profiles|roles)/)[1];
    const row = {
      ...body,
      id: security[type].length + 10,
      version: 1,
      principal: false,
    };
    security[type].push(row);
    response.statusCode = 201;
    result = { id: row.id };
  } else if (/admin\/catalog(?:\/publish)?$/.test(pathname)) {
    const row = collections.products;
    if (request.method === "PUT") {
      row.draft = structuredClone(body.document);
      row.version++;
    }
    if (pathname.endsWith("/publish")) {
      row.published = structuredClone(row.draft);
      row.version++;
    }
    result = row;
  } else if (pathname.endsWith("/admin/me"))
    result = {
      id: 900001,
      name: "Vista de prueba",
      permissions: {
        claims: true,
        catalog: true,
        security: true,
        mail: true,
        site: true,
        reservations: true,
        attention: true,
      },
    };
  else if (pathname.endsWith("/public/site"))
    result = {
      content: seed.content,
      business,
      version: 1,
      pages: seed.pages,
      collections: Object.fromEntries(
        Object.entries(collections).map(([key, row]) => [
          key,
          { items: row.published.items.filter((item) => item.visible) },
        ]),
      ),
    };
  else if (pathname.endsWith("/admin/dashboard")) {
    const days = Number(
      new URL(request.url, "http://localhost").searchParams.get("days") || 30,
    );
    const series = Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - days + 1 + index);
      return { date: date.toISOString().slice(0, 10), total: index % 4 };
    });
    const total = series.reduce((sum, p) => sum + p.total, 0);
    result = {
      days,
      timezone: "America/Lima",
      generated_at: new Date().toISOString(),
      reservations: {
        total,
        pending: Math.floor(total / 3),
        today: 3,
        statuses: {
          pending: Math.floor(total / 3),
          confirmed: total - Math.floor(total / 3) - 4,
          completed: 3,
          cancelled: 1,
        },
        series,
        branches: [{ branch: "Por coordinar", total }],
        upcoming: [],
      },
      messages: { total: 8, unread: 3 },
      mail: { sent: 4, simulated: 2, pending: 1 },
      content: { pages: 28, drafts: 1, collections: { reviews: 6, plans: 6 } },
    };
  } else if (
    /\/site\/collections\/(reviews|plans)(?:\/publish)?$/.test(pathname)
  ) {
    const key = pathname.split("/").at(pathname.endsWith("/publish") ? -2 : -1);
    const row = collections[key];
    if (request.method === "PUT") {
      row.draft = structuredClone(body.document);
      row.version++;
    }
    if (pathname.endsWith("/publish")) {
      row.published = structuredClone(row.draft);
      row.version++;
    }
    result = row;
  } else if (pathname.endsWith("/site/modules")) result = modules;
  else if (/\/site\/modules\/[a-z0-9-]+(?:\/publish)?$/.test(pathname)) {
    const key = pathname.split("/").at(pathname.endsWith("/publish") ? -2 : -1);
    const m = modules.find((m) => m.key === key);
    if (pathname.endsWith("/publish")) m.published = { ...m.draft };
    else m.draft = body.content;
    m.version++;
    result = m;
  } else if (pathname.endsWith("/site/settings")) {
    if (request.method === "PUT") {
      seed.content = body.content;
      siteVersion++;
    }
    result = { content: seed.content, version: siteVersion };
  } else if (pathname.endsWith("/admin/reservations"))
    result = { data: [], total: 0, current_page: 1, last_page: 1 };
  else if (pathname.endsWith("/admin/messages"))
    result = { data: [], total: 0, current_page: 1, last_page: 1 };
  else if (pathname.endsWith("/mail/branding")) {
    if (request.method === "PUT")
      mailBranding = {
        version: mailBranding.version + 1,
        branding: body.branding,
      };
    result = mailBranding;
  } else if (pathname.endsWith("/mail/branding/preview"))
    result = renderEmail(template.draft, body.branding);
  else if (pathname.endsWith("/templates/1/preview"))
    result = renderEmail(body.document, mailBranding.branding);
  else if (pathname.endsWith("/mail/templates")) result = [template];
  else if (pathname.endsWith("/templates/1") && request.method === "PUT") {
    template = {
      ...template,
      draft: body.document,
      version: template.version + 1,
    };
    result = template;
  } else if (pathname.endsWith("/templates/1/publish")) {
    template.published_version = template.version;
    result = template;
  } else if (pathname.endsWith("/mail/deliveries")) result = [];
  else if (pathname.endsWith("/mail/settings"))
    result = {
      id: 1,
      enabled: false,
      transport: "array",
      from_name: "Nident",
      from_address: "",
      reply_to: "",
      contact_to: "",
      host: "",
      port: 587,
      encryption: "tls",
      username: "",
      has_password: false,
      version: 1,
    };
  else {
    response.statusCode = 404;
    response.end(
      JSON.stringify({ message: "Operación fuera de la fixture visual." }),
    );
    return;
  }
  response.end(JSON.stringify({ success: true, result }));
});
await new Promise((resolve) => fixture.listen(18001, "127.0.0.1", resolve));
const server = spawn(process.execPath, ["dist/server/entry.mjs"], {
  cwd: path.join(root, "Frontend-nident"),
  env: {
    ...process.env,
    API_INTERNAL_URL: "http://127.0.0.1:18001/api/v1",
    PUBLIC_SITE_URL: "http://127.0.0.1:14321",
    NIDENT_ALLOW_FILE_SESSIONS: "true",
    NIDENT_SESSION_DIR: path.join(root, ".runtime/visual-sessions"),
    HOST: "127.0.0.1",
    PORT: "14321",
  },
  stdio: "ignore",
});
let browser;
try {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch("http://127.0.0.1:14321/admin/login");
      if (response.ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1512, height: 1050 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const nativeDialogs = [];
  page.on("dialog", async (dialog) => {
    nativeDialogs.push(dialog.type());
    await dialog.dismiss();
  });
  await page.goto("http://127.0.0.1:14321/admin/login", {
    waitUntil: "networkidle",
  });
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("qa@example.invalid");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("synthetic-account-no-database");
  await page.getByRole("button", { name: "Entrar al panel" }).click();
  await page.waitForURL("**/admin");
  await verifyModules(page, output);
  await verifyOperations(page, output);
  const visibleReviews = structuredClone(collections.reviews.published);
  const visiblePlans = structuredClone(collections.plans.published);
  collections.reviews.published.items = [];
  collections.plans.published.items = [];
  await page.goto("http://127.0.0.1:14321/", { waitUntil: "networkidle" });
  if (await page.locator(".reviews-track,.plans-section").count())
    throw Error("Las colecciones vacías deben ocultarse en inicio.");
  await page.goto("http://127.0.0.1:14321/promociones");
  await page
    .getByText("Por ahora no hay planes publicados.", { exact: false })
    .waitFor();
  collections.reviews.published = visibleReviews;
  collections.plans.published = visiblePlans;
  await page.goto("http://127.0.0.1:14321/admin/sitio/nosotros");
  await page.locator("#site-frame").waitFor();
  await page.frameLocator("#site-frame").locator("h1").first().waitFor();
  await page.frameLocator("#site-frame").locator("h1").first().click();
  const textField = schemas.nosotros.fields.find(
    (f) => f.type === "text" && f.group === "h1",
  );
  await page.locator("#field-picker").selectOption(textField.id);
  await page
    .locator("#field-controls textarea")
    .fill("Contenido editado desde el lienzo");
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await page
    .getByText("Borrador guardado. Puedes publicarlo cuando esté listo.")
    .waitFor();
  await page
    .getByRole("button", { name: "Publicar módulo", exact: true })
    .click();
  await page
    .getByText(
      "Módulo publicado. Los cambios ya están disponibles en el sitio.",
    )
    .waitFor();
  const canvasFrame = page.frames().find((f) => f.parentFrame());
  await canvasFrame.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((img) => img.complete)
        .map((img) => img.decode().catch(() => {})),
    );
  });
  await canvasFrame
    .getByText("Contenido editado desde el lienzo", { exact: false })
    .waitFor();
  await page.screenshot({
    path: path.join(output, "canvas-nosotros-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(output, "canvas-nosotros-mobile.png"),
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Desbordamiento en canvas móvil");
  await page.setViewportSize({ width: 1512, height: 1050 });
  await page.goto("http://127.0.0.1:14321/admin/sliders");
  await page.locator("#slide-title").click();
  await page.locator("#slider-field-title").fill("Una sonrisa editada");
  await page
    .getByRole("button", { name: "Guardar y publicar", exact: true })
    .click();
  await page.getByText("Sliders publicados en el inicio.").waitFor();
  await page.screenshot({
    path: path.join(output, "sliders-desktop.png"),
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:14321/admin/reservas");
  await page.getByText("No hay reservas en esta vista.").waitFor();
  await page.screenshot({
    path: path.join(output, "reservas-desktop.png"),
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:14321/reservar");
  await page
    .getByLabel("Nombre y apellidos", { exact: true })
    .fill("Paciente sintético");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("reserva@example.invalid");
  await page
    .getByLabel("Teléfono de contacto", { exact: true })
    .fill("999123456");
  await page
    .locator('#reservation-public-form select[name="treatment"]')
    .selectOption({ label: "Evaluación general" });
  await page
    .locator('#reservation-public-form select[name="branch"]')
    .selectOption({ label: "Por coordinar" });
  const future = new Date();
  future.setDate(future.getDate() + 3);
  await page
    .getByLabel("Fecha preferida", { exact: true })
    .fill(future.toISOString().slice(0, 10));
  await page.getByLabel("Hora preferida · Perú", { exact: true }).fill("10:30");
  await page.locator('#reservation-public-form input[name="privacy"]').check();
  await page
    .getByRole("button", { name: "Solicitar mi cita", exact: true })
    .click();
  await page.getByText(/Tu código es NID-VISUAL-RESERVA/).waitFor();
  await page.goto("http://127.0.0.1:14321/admin/correos");
  await page.getByRole("button", { name: /Recepción de contacto/ }).waitFor();
  await page.screenshot({
    path: path.join(output, "correos-desktop.png"),
    fullPage: true,
  });
  await page
    .locator("#mail-subject")
    .fill("Asunto editado en la prueba visual");
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await page
    .getByText("Borrador guardado. La versión publicada sigue vigente.")
    .waitFor();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await page
    .getByText("Plantilla publicada. Los nuevos envíos usarán esta versión.")
    .waitFor();
  await page
    .getByRole("button", { name: "Logo, banner y footer", exact: true })
    .click();
  await page.locator('#mail-branding-form [name="phone"]').fill("999000000");
  await page
    .locator('#mail-branding-form [name="email"]')
    .fill("atencion@example.invalid");
  await page
    .getByRole("button", { name: "Agregar enlace", exact: true })
    .click();
  await page.locator("[data-link-label]").fill("Privacidad");
  await page
    .locator("[data-link-url]")
    .fill("https://example.invalid/privacidad");
  await page
    .getByRole("button", { name: "Guardar identidad", exact: true })
    .click();
  await page
    .getByText(
      "Identidad guardada. Los nuevos correos usarán este logo, banner y footer.",
    )
    .waitFor();
  await page
    .frameLocator("#branding-frame")
    .getByText("999000000", { exact: false })
    .waitFor();
  const brandedFrame = await (
    await page.locator("#branding-frame").elementHandle()
  ).contentFrame();
  await brandedFrame.waitForFunction(() =>
    Array.from(document.images).every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
  await page.screenshot({
    path: path.join(output, "identidad-correo-desktop.png"),
    fullPage: true,
  });
  await page
    .locator("#branding-frame")
    .screenshot({ path: path.join(output, "correo-nident-final.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Desbordamiento en identidad de correo móvil");
  await page.locator("#branding-frame").scrollIntoViewIfNeeded();
  await page
    .frameLocator("#branding-frame")
    .getByText("Estamos para ayudarte.", { exact: true })
    .waitFor();
  if (
    await brandedFrame.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    )
  )
    throw Error("Desbordamiento dentro del correo móvil");
  await page
    .locator("#branding-frame")
    .screenshot({ path: path.join(output, "correo-nident-mobile.png") });
  await page.screenshot({
    path: path.join(output, "identidad-correo-mobile.png"),
    fullPage: true,
  });
  await page.goto(
    "http://127.0.0.1:14321/admin/mensajes?status=unread&search=consulta&per_page=50",
  );
  await page
    .getByRole("button", { name: "Filtrar mensajes", exact: true })
    .waitFor();
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Desbordamiento en filtros de mensajes");
  await page.screenshot({
    path: path.join(output, "mensajes-filtros-mobile.png"),
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:14321/admin/correos");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(output, "correos-mobile.png"),
    fullPage: true,
  });
  const editorOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  await page
    .getByRole("button", { name: "Configuración de envío", exact: true })
    .click();
  await page.getByLabel("Nombre del remitente").waitFor();
  await page.screenshot({
    path: path.join(output, "correo-config-mobile.png"),
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:14321/contacto", {
    waitUntil: "networkidle",
  });
  const consent = page
    .getByRole("button", { name: "Solo necesarias", exact: true })
    .first();
  if (await consent.isVisible()) await consent.click();
  await page
    .locator('#inquiry-form input[name="nombre"]')
    .fill("Paciente de prueba");
  await page
    .locator('#inquiry-form input[name="correo"]')
    .fill("contacto@example.invalid");
  await page
    .locator('#inquiry-form select[name="asunto"]')
    .selectOption({ label: "Mi primera visita" });
  await page
    .locator('#inquiry-form textarea[name="mensaje"]')
    .fill("Esta es una consulta sintética de verificación.");
  await page.locator('#inquiry-form input[name="acepto_privacidad"]').check();
  await page.getByRole("button", { name: "Enviar mi consulta" }).click();
  await page
    .getByText("Tu mensaje quedó registrado.", { exact: true })
    .waitFor();
  await page.setViewportSize({ width: 1512, height: 1050 });
  const homeResponse = await page.goto("http://127.0.0.1:14321/", {
    waitUntil: "networkidle",
  });
  await page.screenshot({
    path: path.join(output, "inicio-desktop.png"),
    fullPage: false,
  });
  const slideCount = await page.locator(".hero-slide").count();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(output, "inicio-mobile.png"),
    fullPage: false,
  });
  const homeOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  const result = {
    fixture:
      "API sintética en memoria; sin cuentas, correo real ni persistencia de contacto",
    publicHomeStatus: homeResponse.status(),
    slideCount,
    editorOverflow,
    homeOverflow,
    pageErrors: errors,
    nativeDialogs,
    collectionCrudAndPlanDetails: true,
    customExitAndDeleteConfirmations: true,
    savedAndPublishedInFixture: true,
    contactSubmittedInFixture: true,
    screenshots: fs.readdirSync(output),
  };
  fs.writeFileSync(
    path.join(root, ".runtime/visual-check.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  if (
    errors.length ||
    nativeDialogs.length ||
    editorOverflow ||
    homeOverflow ||
    homeResponse.status() !== 200 ||
    slideCount !== seed.content.hero.length
  )
    process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
  await new Promise((resolve) => fixture.close(resolve));
}
