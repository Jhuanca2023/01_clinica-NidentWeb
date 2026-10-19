const form = document.querySelector<HTMLFormElement>("#site-settings");
if (form) {
  const csrf = document.querySelector<HTMLMetaElement>(
    'meta[name="csrf-token"]',
  )!.content;
  const feedback = (text: string, error = false) => {
    const element = document.getElementById("site-feedback")!;
    element.textContent = text;
    element.hidden = false;
    element.className = `notice ${error ? "error" : "success"}`;
    element.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
  };
  async function save(path: string, body: unknown) {
    const response = await fetch(`/admin/actions/site/${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify(body),
    });
    if (response.status === 401) {
      location.href = "/admin/login";
      throw new Error("La sesión venció.");
    }
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.errors
          ? Object.values(result.errors).flat().join(" ")
          : result.message || "No se pudo guardar.",
      );
    return result.result;
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>(
      "button[type=submit]",
    )!;
    button.disabled = true;
    const content: Record<string, any> = { nav: [], hero: [] };
    form
      .querySelectorAll<HTMLInputElement>("[data-site-key]")
      .forEach((input) => {
        content[input.dataset.siteKey!] = input.value;
      });
    form
      .querySelectorAll<HTMLInputElement>("[data-nav-index]")
      .forEach((input) => {
        const index = Number(input.dataset.navIndex);
        content.nav[index] ||= {};
        content.nav[index][input.dataset.navKey!] = input.value;
      });
    form
      .querySelectorAll<HTMLInputElement>("[data-hero-index]")
      .forEach((input) => {
        const index = Number(input.dataset.heroIndex);
        content.hero[index] ||= {};
        content.hero[index][input.dataset.heroKey!] = input.value;
      });
    try {
      const result = await save("settings", {
        version: Number(form.dataset.version),
        content,
      });
      form.dataset.version = String(result.version);
      feedback("Configuración publicada. Abre el sitio para ver los cambios.");
    } catch (error) {
      feedback((error as Error).message, true);
    } finally {
      button.disabled = false;
    }
  });
  document
    .querySelectorAll<HTMLFormElement>("form[data-page-id]")
    .forEach((pageForm) =>
      pageForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = pageForm.querySelector<HTMLButtonElement>("button")!;
        button.disabled = true;
        const data = new FormData(pageForm);
        try {
          await save(`pages/${pageForm.dataset.pageId}`, {
            title: data.get("title"),
            description: data.get("description") || "",
            published: data.has("published"),
          });
          feedback("Página actualizada.");
        } catch (error) {
          feedback((error as Error).message, true);
        } finally {
          button.disabled = false;
        }
      }),
    );
}
