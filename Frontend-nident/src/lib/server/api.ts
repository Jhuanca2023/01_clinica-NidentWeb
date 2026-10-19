export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export async function api<T = any>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const base =
    process.env.API_INTERNAL_URL ||
    import.meta.env.API_INTERNAL_URL ||
    "http://127.0.0.1:8000/api/v1";
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: options.method || "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(
      503,
      "No pudimos conectar con Nident. Intenta de nuevo en unos momentos.",
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      response.status,
      response.status >= 500
        ? "El servicio no pudo completar la solicitud. Intenta de nuevo."
        : data.message || "No se pudo completar la solicitud.",
      data.errors,
    );
  return data;
}
