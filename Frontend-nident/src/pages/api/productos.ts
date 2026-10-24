import type { APIRoute } from "astro";
import { api } from "../../lib/server/api";
export const GET: APIRoute = async () => {
  try {
    return Response.json(await api("/public/products"), {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch {
    return Response.json(
      { message: "No se pudo cargar el catálogo." },
      { status: 503 },
    );
  }
};
