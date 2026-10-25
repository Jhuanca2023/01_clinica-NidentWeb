import type { APIRoute } from "astro";
import { publicDocument } from "../lib/server/public-site";
export const GET: APIRoute = async ({ url }) => {
  try {
    const result = { result: await publicDocument() } as any;
    const base = import.meta.env.PUBLIC_SITE_URL || url.origin;
    const plans = (result.result.collections?.plans?.items || []).map(
      (plan: any) => ({ path: "/planes/" + plan.slug }),
    );
    result.result.pages = result.result.pages.filter(
      (page: any) => !page.path.startsWith("/packs/"),
    );
    result.result.pages.push(
      ...plans,
      ...(result.result.collections?.products?.items || [])
        .filter((item: any) => item.visible)
        .map((item: any) => ({ path: "/productos/" + item.slug })),
    );
    const escape = (text: string) =>
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${result.result.pages.map((page: any) => `<url><loc>${escape(new URL(page.path, base).href)}</loc></url>`).join("")}</urlset>`,
      { headers: { "Content-Type": "application/xml" } },
    );
  } catch {
    return new Response("Servicio no disponible.", { status: 503 });
  }
};
