import { notificationCopy } from "../lib/notification-copy";
const contactForm = document.querySelector<HTMLFormElement>(
  "#inquiry-form[data-api-contact]",
);
if (contactForm) {
  const error = document.querySelector<HTMLElement>("#inquiry-error")!;
  const result = document.querySelector<HTMLElement>("#inquiry-result")!;
  const parameters = new URLSearchParams(location.search);
  if (parameters.has("producto") || parameters.has("seleccion")) {
    fetch("/api/productos")
      .then((r) => r.json())
      .then((products) => {
        const message =
          contactForm.querySelector<HTMLTextAreaElement>('[name="mensaje"]')!;
        const topic =
          contactForm.querySelector<HTMLSelectElement>('[name="asunto"]')!;
        if (topic.options.length)
          topic.selectedIndex = topic.options.length - 1;
        let cart: any = {};
        try {
          cart = JSON.parse(parameters.get("seleccion") || "{}");
        } catch {}
        const selected = products.filter(
          (item: any) =>
            item.slug === parameters.get("producto") ||
            (Number.isInteger(cart[item.id]) && cart[item.id] > 0),
        );
        if (selected.length)
          message.value =
            "Quisiera información sobre:\n" +
            selected
              .map(
                (item: any) =>
                  item.name +
                  " · " +
                  Math.min(9, cart[item.id] || 1) +
                  " unidad(es)",
              )
              .join("\n");
      })
      .catch(() => {});
  }
  let requestId = crypto.randomUUID();
  let pending = false;
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (pending) return;
    if (!contactForm.reportValidity()) return;
    pending = true;
    const button = contactForm.querySelector<HTMLButtonElement>(
      "button[type=submit]",
    )!;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    error.hidden = true;
    result.hidden = true;
    const data = Object.fromEntries(new FormData(contactForm));
    try {
      const response = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, request_id: requestId }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.errors
            ? Object.values(body.errors).flat().join(" ")
            : body.message ||
                "No se pudo registrar el mensaje. Intenta de nuevo.",
        );
      result.replaceChildren();
      const title = document.createElement("h3");
      title.textContent = "Tu mensaje quedó registrado.";
      const note = document.createElement("p");
      note.textContent = `El equipo de Nident podrá revisarlo. Tu referencia es ${body.result.reference}.`;
      result.append(title, note);
      const notification = document.createElement("p");
      notification.textContent = notificationCopy(body.result.notification);
      const link = document.createElement("a");
      link.className = "reference-link";
      link.href =
        "/consultar-solicitud?ref=" + encodeURIComponent(body.result.reference);
      link.textContent = "Consultar el estado de mi mensaje";
      result.append(notification, link);
      result.hidden = false;
      result.tabIndex = -1;
      result.focus();
      contactForm.reset();
      requestId = crypto.randomUUID();
    } catch (exception) {
      error.textContent = (exception as Error).message;
      error.hidden = false;
    } finally {
      pending = false;
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  });
}
