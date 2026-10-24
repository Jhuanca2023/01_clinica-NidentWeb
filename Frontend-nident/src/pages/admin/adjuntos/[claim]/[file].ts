import type { APIRoute } from "astro";
export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.token) return new Response(null, { status: 401 });
  if (!/^\d+$/.test(params.claim || "") || !/^\d+$/.test(params.file || ""))
    return new Response(null, { status: 404 });
  const base =
    process.env.API_INTERNAL_URL ||
    import.meta.env.API_INTERNAL_URL ||
    "http://127.0.0.1:8000/api/v1";
  try {
    const response = await fetch(
      `${base}/admin/claims/${params.claim}/attachments/${params.file}`,
      {
        headers: {
          Authorization: `Bearer ${locals.token}`,
          Accept: "application/octet-stream",
        },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      return new Response("No se pudo abrir el adjunto.", {
        status: response.status,
      });
    return new Response(response.body, {
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition":
          response.headers.get("Content-Disposition") || "attachment",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("No se pudo abrir el adjunto.", { status: 503 });
  }
};
