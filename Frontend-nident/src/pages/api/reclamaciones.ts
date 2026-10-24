import type { APIRoute } from "astro";
export const POST: APIRoute = async ({ request, url }) => {
  const origin = new URL(
    process.env.PUBLIC_SITE_URL ||
      import.meta.env.PUBLIC_SITE_URL ||
      url.origin,
  ).origin;
  if (request.headers.get("origin") !== origin)
    return Response.json({ message: "Origen no permitido." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 16500000)
    return Response.json(
      { message: "Los adjuntos superan el tamaño permitido." },
      { status: 413 },
    );
  try {
    const body = await request.formData();
    const base =
      process.env.API_INTERNAL_URL ||
      import.meta.env.API_INTERNAL_URL ||
      "http://127.0.0.1:8000/api/v1";
    const response = await fetch(base + "/public/claims", {
      method: "POST",
      body,
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30000),
    });
    return Response.json(
      response.status >= 500
        ? { message: "No pudimos registrar la solicitud. Intenta nuevamente." }
        : await response.json(),
      {
        status: response.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch {
    return Response.json(
      { message: "No pudimos registrar la solicitud. Intenta nuevamente." },
      { status: 503 },
    );
  }
};
