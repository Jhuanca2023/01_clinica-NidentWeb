import { notificationCopy } from "../lib/notification-copy";
const form = document.getElementById(
  "claim-public-form",
) as HTMLFormElement | null;
if (form) {
  let requestId = crypto.randomUUID(),
    lastBody = "";
  const toggle = document.getElementById("minor-toggle") as HTMLInputElement;
  toggle.addEventListener("change", () => {
    const group = document.getElementById("guardian-fields")!;
    group.hidden = !toggle.checked;
    group.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
      input.required = toggle.checked;
      if (!toggle.checked) input.value = "";
    });
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const feedback = document.getElementById("claim-feedback")!;
    const button = form.querySelector("button")!;
    feedback.hidden = true;
    const files = (document.getElementById("claim-files") as HTMLInputElement)
      .files;
    if (
      files &&
      (files.length > 3 ||
        Array.from(files).some((file) => file.size > 5242880))
    ) {
      feedback.textContent = "Selecciona hasta tres archivos de 5 MB cada uno.";
      feedback.hidden = false;
      return;
    }
    const body = new FormData(form);
    body.set("minor", toggle.checked ? "1" : "0");
    body.set("privacy", "1");
    if (!files?.length) body.delete("attachments[]");
    const signature = JSON.stringify(
      Array.from(body.entries()).map(([key, value]) => [
        key,
        value instanceof File
          ? `${value.name}:${value.size}:${value.lastModified}`
          : value,
      ]),
    );
    if (lastBody && lastBody !== signature) requestId = crypto.randomUUID();
    lastBody = signature;
    body.set("request_id", requestId);
    button.disabled = true;
    try {
      const response = await fetch("/api/reclamaciones", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(
          data.errors
            ? Object.values(data.errors).flat().join(" ")
            : data.message || "No se pudo registrar la solicitud.",
        );
      const receipt = document.getElementById("claim-receipt")!;
      receipt.replaceChildren();
      const title = document.createElement("h2");
      title.textContent = "Constancia de tu solicitud";
      const reference = document.createElement("p");
      reference.textContent = `Hoja ${data.result.sheet_number} · ${data.result.reference}`;
      const note = document.createElement("p");
      note.textContent = notificationCopy(data.result.notification);
      const copy = document.createElement("div");
      copy.className = "receipt-copy";
      copy.textContent = [
        document.getElementById("claim-provider")?.textContent || "Nident",
        ...(toggle.checked
          ? [
              `Representante: ${body.get("guardian")}`,
              `Correo del representante: ${body.get("guardian_email")}`,
              `Teléfono del representante: ${body.get("guardian_phone")}`,
              `Domicilio del representante: ${body.get("guardian_address")}`,
            ]
          : []),
        `Fecha de registro: ${data.result.registered_at}`,
        `Consumidor: ${body.get("name")}`,
        `Documento: ${body.get("document_type")} ${body.get("document_number")}`,
        `Correo: ${body.get("email")}`,
        `Teléfono: ${body.get("phone")}`,
        `Domicilio: ${body.get("address")}`,
        `Tipo: ${body.get("type")}`,
        `Producto o servicio: ${body.get("service")}`,
        `Monto: ${body.get("amount") || "No indicado"}`,
        `Detalle:\n${body.get("detail")}`,
        `Pedido:\n${body.get("requested_solution")}`,
      ].join("\n\n");
      const actions = document.createElement("div");
      actions.className = "public-links";
      const print = document.createElement("button");
      print.type = "button";
      print.className = "btn pri";
      print.textContent = "Imprimir constancia";
      print.addEventListener("click", () => window.print());
      const link = document.createElement("a");
      link.href =
        "/consultar-solicitud?ref=" + encodeURIComponent(data.result.reference);
      link.textContent = "Consultar el estado de mi solicitud";
      actions.append(print, link);
      receipt.append(title, reference, note, copy, actions);
      receipt.hidden = false;
      receipt.tabIndex = -1;
      receipt.focus();
      form.reset();
      toggle.dispatchEvent(new Event("change"));
      requestId = crypto.randomUUID();
      lastBody = "";
    } catch (error) {
      feedback.textContent = (error as Error).message;
      feedback.className = "public-feedback error";
      feedback.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
}
