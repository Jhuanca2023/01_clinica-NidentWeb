import type { APIRoute } from "astro";
export const GET: APIRoute = async ({ params }) => {
  if (!/^[a-f0-9]{40}\.(jpg|png|webp)$/.test(params.name || ""))
    return new Response(null, { status: 404 });
  const base =
    process.env.API_INTERNAL_URL ||
    import.meta.env.API_INTERNAL_URL ||
    "http://127.0.0.1:8000/api/v1";
  try {
    const response = await fetch(`${base}/public/media/${params.name}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return new Response(null, { status: response.status });
    return new Response(response.body, {
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public,max-age=31536000,immutable",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
};
