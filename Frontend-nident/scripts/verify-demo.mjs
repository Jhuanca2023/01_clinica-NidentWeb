import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const cwd = fileURLToPath(new URL("../", import.meta.url));
const env = {
  ...process.env,
  NIDENT_DEMO_MODE: "true",
  NIDENT_DEPLOY_TARGET: "node",
  API_INTERNAL_URL: "http://127.0.0.1:1/api/v1",
  NIDENT_ALLOW_FILE_SESSIONS: "true",
  NIDENT_SESSION_DIR: path.join(cwd, "../.runtime/demo-sessions"),
  PUBLIC_SITE_URL: "http://127.0.0.1:14322",
};
delete env.NETLIFY;
const build = spawnSync(
  process.execPath,
  ["node_modules/astro/bin/astro.mjs", "build"],
  { cwd, env, stdio: "inherit" },
);
if (build.status !== 0) process.exit(build.status ?? 1);
async function start(port, demo) {
  const runtimeEnv = {
    ...env,
    NIDENT_DEMO_MODE: demo,
    HOST: "127.0.0.1",
    PORT: String(port),
  };
  if (demo === undefined) delete runtimeEnv.NIDENT_DEMO_MODE;
  const child = spawn(process.execPath, ["dist/server/entry.mjs"], {
    cwd,
    env: runtimeEnv,
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch("http://127.0.0.1:" + port + "/robots.txt");
      return child;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  child.kill();
  throw Error("No arrancó el servidor de comprobación.");
}
let server, live;
try {
  server = await start(14322, undefined);
  const base = "http://127.0.0.1:14322";
  const snapshot = JSON.parse(
    fs.readFileSync(
      new URL("../src/data/demo-site.json", import.meta.url),
      "utf8",
    ),
  );
  const routes = [
    ...snapshot.pages.map((page) => page.path),
    ...snapshot.collections.plans.items.map((item) => "/planes/" + item.slug),
    ...snapshot.collections.products.items.map(
      (item) => "/productos/" + item.slug,
    ),
  ];
  const images = new Set();
  for (const route of routes) {
    const response = await fetch(base + route, { redirect: "manual" });
    assert.ok(
      [200, 301, 302].includes(response.status),
      route + " responde sin Laravel",
    );
    if (response.status !== 200) continue;
    const html = await response.text();
    assert.ok(
      html.includes("Vista de demostración de Nident"),
      route + " avisa el modo demo",
    );
    for (const match of html.matchAll(/<img\b[^>]*src="([^"]+)"/g))
      if (match[1].startsWith("/")) images.add(match[1]);
    if (
      [
        "/reservar",
        "/contacto",
        "/libro-reclamaciones",
        "/consultar-solicitud",
      ].includes(route)
    )
      assert.match(
        html,
        /<fieldset disabled/,
        "El formulario queda desactivado",
      );
  }
  for (const image of images) {
    const response = await fetch(base + image);
    assert.equal(response.status, 200, image + " disponible");
    assert.match(response.headers.get("content-type") || "", /^image\//);
  }
  assert.equal((await fetch(base + "/admin/login")).status, 503);
  assert.equal(
    (
      await fetch(base + "/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
    503,
  );
  assert.equal(
    (
      await fetch(base + "/api/reclamaciones", {
        method: "POST",
        body: "synthetic",
      })
    ).status,
    503,
  );
  assert.equal((await (await fetch(base + "/api/productos")).json()).length, 6);
  assert.equal((await fetch(base + "/no-existe")).status, 404);
  assert.equal((await fetch(base + "/sitemap.xml")).status, 200);
  if (process.env.PLAYWRIGHT_MODULE) {
    const { chromium } = createRequire(import.meta.url)(
      process.env.PLAYWRIGHT_MODULE,
    );
    const browser = await chromium.launch({
      channel: "msedge",
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1512, height: 1050 },
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base, { waitUntil: "networkidle" });
      await page
        .getByRole("note")
        .filter({ hasText: "Vista de demostración" })
        .waitFor();
      await page.screenshot({
        path: path.join(cwd, "../.runtime/netlify-demo-desktop.png"),
        fullPage: false,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: path.join(cwd, "../.runtime/netlify-demo-mobile.png"),
        fullPage: false,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      for (const route of ["/reservar", "/contacto", "/libro-reclamaciones"]) {
        await page.goto(base + route, { waitUntil: "networkidle" });
        assert.equal(
          await page.locator("form button").first().isDisabled(),
          true,
          route + " no envía datos",
        );
      }
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  }
  live = await start(14323, "false");
  assert.equal(
    (await fetch("http://127.0.0.1:14323/")).status,
    503,
    "El modo conectado no disfraza una API caída con contenido de demostración",
  );
  console.log(
    JSON.stringify({
      demoWithoutBackend: true,
      pages: routes.length,
      images: images.size,
      writesDisabled: true,
      adminDisabled: true,
      liveFailureVisible: true,
    }),
  );
} finally {
  server?.kill();
  live?.kill();
}
