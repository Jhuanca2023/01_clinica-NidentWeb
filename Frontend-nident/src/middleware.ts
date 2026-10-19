import { defineMiddleware } from "astro:middleware";
import { randomBytes, timingSafeEqual } from "node:crypto";
import legacyRoutes from "./data/route-map.json";

export const onRequest = defineMiddleware(async (context, next) => {
  const original = new URL(context.request.url);
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
  if (!context.url.pathname.startsWith("/admin")) return next();
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
