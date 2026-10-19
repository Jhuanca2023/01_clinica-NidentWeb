import type { APIRoute } from "astro";
import { api, ApiError } from "../../lib/server/api";
export const POST: APIRoute = async ({ request, url }) => {
  const origin =
    process.env.PUBLIC_SITE_URL ||
    import.meta.env.PUBLIC_SITE_URL ||
    url.origin;
  if (request.headers.get("origin") !== new URL(origin).origin)
    return Response.json({ message: "Origen no permitido." }, { status: 403 });
  try {
    const text = await request.text();
    if (text.length > 12000)
      return Response.json(
        { message: "El mensaje es demasiado largo." },
        { status: 413 },
      );
    return Response.json(
      await api("/public/contact", { method: "POST", body: JSON.parse(text) }),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApiError)
      return Response.json(
        { message: error.message, errors: error.errors },
        { status: error.status },
      );
    return Response.json(
      { message: "La solicitud no es válida." },
      { status: 400 },
    );
  }
};
