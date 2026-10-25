export function demoMode(): boolean {
  return (
    (process.env.NIDENT_DEMO_MODE ?? import.meta.env.NIDENT_DEMO_MODE) ===
    "true"
  );
}
export function demoUnavailable() {
  return Response.json(
    {
      message:
        "Esta es una demostración visual. Los formularios y el panel estarán disponibles al conectar el backend de Nident.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
