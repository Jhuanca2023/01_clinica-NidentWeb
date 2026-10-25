import type { APIRoute } from "astro";
import { api } from "../../lib/server/api";
import { demoMode } from "../../lib/server/deployment";
import snapshot from "../../data/demo-site.json";
export const GET: APIRoute = async () => {
  try {
    return Response.json(
      demoMode()
        ? snapshot.collections.products.items
            .filter((item) => item.visible)
            .map((item) => ({
              ...item,
              name: item.title,
              price: Number(item.price),
            }))
        : await api("/public/products"),
      {
        headers: { "Cache-Control": "no-cache" },
      },
    );
  } catch {
    return Response.json(
      { message: "No se pudo cargar el catálogo." },
      { status: 503 },
    );
  }
};
