import type { APIRoute } from "astro";
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.token)
    return Response.json({ message: "Inicia sesión." }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 5300000)
    return Response.json(
      { message: "La imagen supera 5 MB." },
      { status: 413 },
    );
  try {
    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File) || image.size > 5242880)
      return Response.json(
        { message: "Selecciona una imagen de hasta 5 MB." },
        { status: 422 },
      );
    const body = new FormData();
    body.set("image", image);
    const base =
      process.env.API_INTERNAL_URL ||
      import.meta.env.API_INTERNAL_URL ||
      "http://127.0.0.1:8000/api/v1";
    const response = await fetch(`${base}/admin/media`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${locals.token}`,
      },
      body,
      signal: AbortSignal.timeout(30000),
    });
    const data = await response
      .json()
      .catch(() => ({ message: "No se pudo subir la imagen." }));
    return Response.json(
      response.status >= 500
        ? { message: "El servidor no pudo guardar la imagen." }
        : data,
      { status: response.status },
    );
  } catch {
    return Response.json(
      { message: "No se pudo subir la imagen. Intenta de nuevo." },
      { status: 503 },
    );
  }
};
