export const claimLabels: Record<string, string> = {
  received: "Pendiente",
  reviewing: "En proceso",
  answered: "Finalizado",
};
export function claimLabel(status: string, outcome?: string) {
  return status === "answered"
    ? outcome === "rejected"
      ? "Rechazado"
      : outcome === "resolved"
        ? "Resuelto"
        : "Finalizado"
    : claimLabels[status] || status;
}
export function claimDate(value?: string | null) {
  if (!value) return "—";
  const normalized = /^\d{4}-\d\d-\d\d \d\d:/.test(value)
    ? value.replace(" ", "T") + "-05:00"
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf())
    ? "—"
    : new Intl.DateTimeFormat("es-PE", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Lima",
      }).format(date);
}
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export function claimProgress(
  status: string,
  dates: {
    registered_at?: string;
    reviewing_at?: string;
    answered_at?: string;
  } = {},
) {
  const current = status === "answered" ? 2 : status === "reviewing" ? 1 : 0;
  return (
    '<ol class="claim-progress" aria-label="Estado de la reclamación">' +
    ["Registrado", "En revisión", "Resultado"]
      .map(
        (label, index) =>
          '<li class="' +
          (index < current
            ? "complete"
            : index === current
              ? "current"
              : "pending") +
          '"' +
          (index === current ? ' aria-current="step"' : "") +
          '><span class="claim-step-circle">' +
          (index < current
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
            : index + 1) +
          "</span><strong>" +
          label +
          "</strong><small>" +
          escape(
            index < current
              ? "Completado"
              : index === current
                ? current === 2
                  ? "Finalizado"
                  : current === 0
                    ? "Completado"
                    : "En curso"
                : "Pendiente",
          ) +
          "</small><time>" +
          escape(
            claimDate(
              [dates.registered_at, dates.reviewing_at, dates.answered_at][
                index
              ],
            ),
          ) +
          "</time></li>",
      )
      .join("") +
    "</ol>"
  );
}
