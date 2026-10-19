import type { APIRoute } from "astro";
import { api, ApiError } from "../../../lib/server/api";

const patterns: Record<string, RegExp[]> = {
  GET: [
    /^mail\/(templates|settings|deliveries)$/,
    /^site\/(settings|pages|modules)$/,
    /^reservations$/,
    /^dashboard$/,
    /^site\/collections\/(reviews|plans)$/,
  ],
  PUT: [
    /^mail\/templates\/\d+$/,
    /^mail\/settings$/,
    /^site\/settings$/,
    /^site\/pages\/\d+$/,
    /^site\/modules\/[a-z0-9-]+$/,
    /^reservations\/\d+$/,
    /^site\/collections\/(reviews|plans)$/,
  ],
  POST: [
    /^mail\/templates\/\d+\/(preview|publish|test)$/,
    /^site\/modules\/[a-z0-9-]+\/publish$/,
    /^site\/collections\/(reviews|plans)\/publish$/,
  ],
};

export const ALL: APIRoute = async ({ params, request, locals }) => {
  const path = params.path || "";
  if (!patterns[request.method]?.some((pattern) => pattern.test(path)))
    return Response.json(
      { message: "Operación no disponible." },
      { status: 404 },
    );
  if (!locals.token)
    return Response.json(
      { message: "Inicia sesión de nuevo." },
      { status: 401 },
    );
  if (Number(request.headers.get("content-length") || 0) > 256000)
    return Response.json(
      { message: "El documento es demasiado grande." },
      { status: 413 },
    );
  try {
    const text = request.method === "GET" ? undefined : await request.text();
    if (text && text.length > 256000)
      return Response.json(
        { message: "El documento es demasiado grande." },
        { status: 413 },
      );
    const body = text ? JSON.parse(text) : undefined;
    return Response.json(
      await api(
        `/admin/${path}${request.method === "GET" ? new URL(request.url).search : ""}`,
        {
          method: request.method,
          token: locals.token,
          body,
        },
      ),
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
