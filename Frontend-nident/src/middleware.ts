import { defineMiddleware } from "astro:middleware";
import { randomBytes, timingSafeEqual } from "node:crypto";
import legacyRoutes from "./data/route-map.json";
import { demoMode, demoUnavailable } from "./lib/server/deployment";

export const onRequest = defineMiddleware(async (context, next) => {
  const original = new URL(context.request.url);
  if (demoMode()) {
    if (original.pathname.startsWith("/admin"))
      return new Response(
        '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Administración no disponible · Nident</title></head><body style="font-family:system-ui;max-width:650px;margin:12vh auto;padding:24px;line-height:1.8"><img src="/email-assets/nident-logo.png" width="180" alt="Nident"><h1>Esta versión es una demostración visual.</h1><p>El panel administrativo estará disponible al conectar el backend de Nident.</p><a href="/">Volver al sitio</a></body></html>',
        {
          status: 503,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex, nofollow",
          },
        },
      );
    if (
      original.pathname.startsWith("/api/") &&
      requestMethodWrites(context.request.method)
    )
      return demoUnavailable();
  }
  const legacyFile = original.pathname.split("/").pop() || "";
  if (legacyFile in legacyRoutes) {
    return new Response(null, {
      status: 301,
      headers: {
        Location:
          legacyRoutes[legacyFile as keyof typeof legacyRoutes] +
          original.search,
      },
    });
  }
  if (!context.url.pathname.startsWith("/admin")) {
    const response = await next();
    if (
      !demoMode() ||
      !response.headers.get("Content-Type")?.includes("text/html")
    )
      return response;
    let html = await response.text();
    html = html.replace(
      /(<body\b[^>]*>)/i,
      '$1<aside role="note" style="padding:12px 20px;background:#eee7f7;color:#493465;text-align:center;font:14px/1.6 system-ui">Vista de demostración de Nident. Los formularios y la administración estarán disponibles al conectar el backend.</aside>',
    );
    html = html.replace(
      /(<form\b[^>]*\bid="(?:inquiry-form|reservation-public-form|claim-public-form|request-lookup)"[^>]*>)([\s\S]*?)(<\/form>)/gi,
      '$1<fieldset disabled style="border:0;padding:0;margin:0;min-width:0">$2</fieldset>$3',
    );
    const headers = new Headers(response.headers);
    headers.delete("Content-Length");
    headers.set("X-Robots-Tag", "noindex, nofollow");
    headers.set("Cache-Control", "no-store");
    return new Response(html, { status: response.status, headers });
  }
  if (!context.session)
    return new Response("Las sesiones del panel no están disponibles.", {
      status: 503,
    });
  let csrf = await context.session.get("csrf");
  if (!csrf) {
    csrf = randomBytes(32).toString("hex");
    context.session.set("csrf", csrf);
  }
  context.locals.csrf = csrf;
  context.locals.token = await context.session.get("token");
  if (!["GET", "HEAD", "OPTIONS"].includes(context.request.method)) {
    const origin = context.request.headers.get("origin");
    const configured =
      process.env.PUBLIC_SITE_URL ||
      import.meta.env.PUBLIC_SITE_URL ||
      context.url.origin;
    if (!origin || origin !== new URL(configured).origin)
      return new Response("Origen no permitido.", { status: 403 });
    let supplied = context.request.headers.get("x-csrf-token") || "";
    if (
      context.request.headers
        .get("content-type")
        ?.includes("application/x-www-form-urlencoded")
    ) {
      supplied = String(
        (await context.request.clone().formData()).get("_csrf") || "",
      );
    }
    const a = Buffer.from(csrf),
      b = Buffer.from(supplied);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      return new Response(
        "La sesión del formulario venció. Recarga la página.",
        { status: 403 },
      );
  }
  const publicPaths = ["/admin/login", "/admin/verificar"];
  if (!publicPaths.includes(context.url.pathname) && !context.locals.token) {
    if (context.url.pathname.startsWith("/admin/actions/"))
      return Response.json(
        { message: "Inicia sesión de nuevo." },
        { status: 401 },
      );
    return context.redirect("/admin/login");
  }
  const response = await next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
});
function requestMethodWrites(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method);
}
