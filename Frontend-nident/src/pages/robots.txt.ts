import type { APIRoute } from "astro";
export const GET: APIRoute = ({ url }) =>
  new Response(
    `User-agent: *\nDisallow: /admin\nDisallow: /api\nSitemap: ${import.meta.env.PUBLIC_SITE_URL || url.origin}/sitemap.xml\n`,
    { headers: { "Content-Type": "text/plain" } },
  );
