const contactForm = document.querySelector<HTMLFormElement>(
  "#inquiry-form[data-api-contact]",
);
if (contactForm) {
  const error = document.querySelector<HTMLElement>("#inquiry-error")!;
  const result = document.querySelector<HTMLElement>("#inquiry-result")!;
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
