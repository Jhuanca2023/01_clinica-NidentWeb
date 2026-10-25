import { notificationCopy } from "../lib/notification-copy";
import { claimLabel, claimProgress } from "../lib/claims";
const form = document.getElementById(
  "request-lookup",
) as HTMLFormElement | null;
if (form) {
  const result = document.getElementById("lookup-result")!,
    feedback = document.getElementById("lookup-feedback")!;
  let credentials: Record<string, FormDataEntryValue> | null = null,
    busy = false,
    terminal = false;
  const labels: Record<string, string> = {
    pending: "Pendiente de confirmación",
    confirmed: "Cita confirmada",
    cancelled: "Cita cancelada",
    completed: "Atendida",
    received: "Solicitud recibida",
    reviewed: "Mensaje revisado",
    reviewing: "En revisión",
    answered: "Resultado registrado",
  };
  function paragraph(text: string) {
    const p = document.createElement("p");
    p.textContent = text;
    result.append(p);
  }
  function render(data: any) {
    result.replaceChildren();
    const title = document.createElement("h2");
    title.textContent =
      data.type === "claim"
        ? data.number || "Reclamación"
        : labels[data.status] || data.status;
    result.append(title);
    paragraph(
      data.reference +
        " · " +
        (data.type === "claim"
          ? data.claim_type === "queja"
            ? "Queja"
            : "Reclamo"
          : data.type === "reservation"
            ? "Reserva"
            : "Mensaje de contacto"),
    );
    if (data.type === "claim") {
      const timeline = document.createElement("div");
      timeline.innerHTML = claimProgress(data.status, data);
      result.append(timeline);
      paragraph(
        data.status === "received"
          ? "Tu solicitud quedó registrada y está pendiente de revisión."
          : data.status === "reviewing"
            ? "El equipo de Nident está revisando tu solicitud. Aquí podrás consultar el resultado."
            : "Resultado: " + claimLabel(data.status, data.outcome),
      );
      if (data.status === "answered" && data.response) {
        const heading = document.createElement("h3");
        heading.textContent = "Respuesta de Nident";
        const response = document.createElement("p");
        response.className = "claim-response";
        response.textContent = data.response;
        result.append(heading, response);
      }
    } else paragraph(labels[data.status] || data.status);
    if (data.date)
      paragraph(
        (data.status === "confirmed"
          ? "Fecha confirmada"
          : "Fecha solicitada") +
          ": " +
          data.date +
          " · " +
          data.time +
          " · Perú",
      );
    paragraph(notificationCopy(data.notification));
    const updated = document.createElement("p");
    updated.className = "small-note";
    updated.textContent =
      "Última consulta: " +
      new Intl.DateTimeFormat("es-PE", {
        timeStyle: "medium",
        timeZone: "America/Lima",
      }).format(new Date()) +
      " · Perú";
    result.append(updated);
    if (!terminal) {
      const note = document.createElement("p");
      note.className = "small-note";
      note.textContent =
        "El estado se actualiza automáticamente cada 30 segundos mientras esta página esté visible.";
      result.append(note);
    }
    const refresh = document.createElement("button");
    refresh.type = "button";
    refresh.className = "btn ghost";
    refresh.textContent = "Actualizar estado";
    refresh.addEventListener("click", () => void lookup(false));
    result.append(refresh);
    result.hidden = false;
  }
  async function lookup(manual: boolean) {
    if (!credentials || busy) return;
    busy = true;
    const button = form!.querySelector("button")!;
    button.disabled = true;
    try {
      const response = await fetch("/api/consultar-solicitud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 404 || response.status === 429) terminal = true;
        throw Error(body.message || "No se pudo consultar el estado.");
      }
      terminal = ["answered", "completed", "cancelled", "reviewed"].includes(
        body.result.status,
      );
      feedback.hidden = true;
      render(body.result);
    } catch (error) {
      if (manual || !result.hidden) {
        feedback.textContent = (error as Error).message;
        feedback.className = "public-feedback error";
        feedback.hidden = false;
      }
    } finally {
      busy = false;
      button.disabled = false;
    }
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (busy) return;
    credentials = Object.fromEntries(new FormData(form));
    result.hidden = true;
    terminal = false;
    void lookup(true);
  });
  setInterval(() => {
    if (credentials && !terminal && document.visibilityState === "visible")
      void lookup(false);
  }, 30000);
  document.addEventListener("visibilitychange", () => {
    if (credentials && !terminal && document.visibilityState === "visible")
      void lookup(false);
  });
}
