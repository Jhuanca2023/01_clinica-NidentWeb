import type { APIRoute } from "astro";
import { api, ApiError } from "../../lib/server/api";
export const POST: APIRoute = async ({ request, url }) => {
  const origin = new URL(
    process.env.PUBLIC_SITE_URL ||
      import.meta.env.PUBLIC_SITE_URL ||
      url.origin,
  ).origin;
  if (request.headers.get("origin") !== origin)
    return Response.json({ message: "Origen no permitido." }, { status: 403 });
  try {
    const text = await request.text();
    if (text.length > 12000)
      return Response.json(
        { message: "Solicitud demasiado grande." },
        { status: 413 },
      );
    return Response.json(
      await api("/public/reservations", {
        method: "POST",
        body: JSON.parse(text),
      }),
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof ApiError
            ? error.message
            : "La solicitud no es válida.",
        errors: error instanceof ApiError ? error.errors : undefined,
      },
      { status: error instanceof ApiError ? error.status : 400 },
    );
  }
};
