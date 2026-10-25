export interface MailBranding {
  name: string;
  logo: string;
  logo_alt: string;
  banner: string;
  banner_alt: string;
  tagline: string;
  footer_title: string;
  footer_text: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  links: { label: string; url: string }[];
}
export const brandingDefaults: MailBranding = {
  name: "Nident",
  logo: "/email-assets/nident-logo.png",
  logo_alt: "Nident · Odontología",
  banner: "/email-assets/nident-banner.jpg",
  banner_alt: "Un espacio para cuidar tu sonrisa",
  tagline: "Sonríe a tu manera. Te acompañamos.",
  footer_title: "Estamos para ayudarte.",
  footer_text:
    "Si tienes alguna consulta sobre esta comunicación, contacta al equipo de Nident.",
  address: "",
  phone: "",
  email: "",
  website: "",
  links: [],
};
export const mailImage = (url: string) =>
  /^https:\/\//i.test(url) ||
  /^\/(?:media\/[a-f0-9]{40}\.(?:png|jpg|webp)|email-assets\/nident-(?:logo\.png|banner\.jpg))$/.test(
    url,
  );
export function renderBrandingFrame(branding: MailBranding) {
  const header = document.getElementById("canvas-brand")!;
  header.replaceChildren();
  if (branding.logo && mailImage(branding.logo)) {
    const img = document.createElement("img");
    img.src = branding.logo;
    img.alt = branding.logo_alt;
    header.append(img);
  } else header.append(document.createTextNode(branding.name));
  if (branding.tagline) {
    const note = document.createElement("p");
    note.textContent = branding.tagline;
    header.append(note);
  }
  const banner = document.getElementById("canvas-banner") as HTMLImageElement;
  banner.hidden = !branding.banner || !mailImage(branding.banner);
  if (!banner.hidden) {
    banner.src = branding.banner;
    banner.alt = branding.banner_alt;
  }
  const footer = document.getElementById("canvas-brand-footer")!;
  footer.replaceChildren();
  const title = document.createElement("h3");
  title.textContent = branding.footer_title || branding.name;
  footer.append(title);
  for (const value of [
    branding.footer_text,
    branding.address,
    branding.phone ? `Teléfono: ${branding.phone}` : "",
    branding.email,
  ])
    if (value) {
      const p = document.createElement("p");
      p.textContent = value;
      footer.append(p);
    }
  if (branding.website) {
    const p = document.createElement("p");
    p.textContent = "Visita nuestra web";
    footer.append(p);
  }
  const links = document.createElement("p");
  for (const item of branding.links) {
    const span = document.createElement("span");
    span.textContent = item.label;
    span.style.marginRight = "14px";
    links.append(span);
  }
  footer.append(links);
  const small = document.createElement("small");
  small.textContent =
    branding.name +
    " · Esta comunicación corresponde a una solicitud registrada.";
  footer.append(small);
}
export function initMailBranding(
  call: (path: string, method?: string, body?: unknown) => Promise<any>,
  onChange: () => void,
  templateId: () => number | undefined,
) {
  const form = document.getElementById("mail-branding-form") as HTMLFormElement;
  let value = structuredClone(brandingDefaults),
    version = 1,
    dirty = false,
    busy = false,
    loaded = false;
  let previewRequest = 0;
  let timer: ReturnType<typeof setTimeout>;
  const status = document.getElementById("branding-state")!,
    feedback = document.getElementById("branding-feedback")!;
  const save = document.getElementById("branding-save") as HTMLButtonElement;
  form
    .querySelectorAll<
      HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement
    >("input,button,textarea")
    .forEach((node) => (node.disabled = true));
  const field = (name: string) =>
    form.elements.namedItem(name) as HTMLInputElement;
  function notice(text: string, error = false) {
    feedback.hidden = false;
    feedback.textContent = text;
    feedback.className = "notice " + (error ? "error" : "success");
  }
  function state() {
    save.disabled = busy || !dirty || !loaded;
    (
      document.getElementById("branding-link-add") as HTMLButtonElement
    ).disabled = busy || !loaded || value.links.length >= 6;
    status.textContent = busy
      ? "Guardando…"
      : dirty
        ? "Cambios sin guardar"
        : "Identidad guardada";
  }
  function collect() {
    const fields = Object.fromEntries(new FormData(form));
    for (const key of Object.keys(brandingDefaults).filter(
      (key) => key !== "links",
    ))
      (value as any)[key] = String(fields[key] || "");
    value.links = Array.from(
      document.querySelectorAll<HTMLElement>(".branding-link-row"),
    ).map((row) => ({
      label: row.querySelector<HTMLInputElement>("[data-link-label]")!.value,
      url: row.querySelector<HTMLInputElement>("[data-link-url]")!.value,
    }));
  }
  function images() {
    for (const key of ["logo", "banner"] as const) {
      const image = document.getElementById(
        "branding-" + key + "-preview",
      ) as HTMLImageElement;
      image.hidden = !value[key] || !mailImage(value[key]);
      if (!image.hidden) image.src = value[key];
    }
    onChange();
  }
  function changed() {
    if (!loaded) return;
    collect();
    dirty = true;
    state();
    images();
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (form.checkValidity()) void preview();
    }, 650);
  }
  function links() {
    const container = document.getElementById("branding-links")!;
    container.replaceChildren();
    value.links.forEach((item) => {
      const row = document.createElement("div");
      row.className = "branding-link-row";
      for (const key of ["label", "url"] as const) {
        const label = document.createElement("label");
        label.textContent =
          key === "label" ? "Nombre del enlace" : "Dirección HTTPS";
        const input = document.createElement("input");
        input.type = key === "url" ? "url" : "text";
        input.required = true;
        input.maxLength = key === "url" ? 1000 : 60;
        input.value = item[key];
        input.dataset[key === "label" ? "linkLabel" : "linkUrl"] = "";
        input.placeholder = key === "url" ? "https://…" : "";
        label.append(input);
        row.append(label);
      }
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "danger";
      remove.textContent = "Quitar";
      remove.setAttribute(
        "aria-label",
        "Quitar enlace " + (item.label || "del footer"),
      );
      remove.onclick = () => {
        row.remove();
        changed();
      };
      row.append(remove);
      container.append(row);
    });
    (
      document.getElementById("branding-link-add") as HTMLButtonElement
    ).disabled = value.links.length >= 6;
  }
  function populate() {
    for (const [key, item] of Object.entries(value))
      if (key !== "links") field(key).value = String(item || "");
    links();
    images();
    state();
  }
  async function preview() {
    if (!loaded || busy) return;
    const request = ++previewRequest;
    collect();
    try {
      const rendered = await call("mail/branding/preview", "POST", {
        version,
        branding: value,
        template_id: templateId(),
      });
      if (request !== previewRequest) return;
      (document.getElementById("branding-frame") as HTMLIFrameElement).srcdoc =
        rendered.html;
    } catch (error) {
      if (request === previewRequest) notice((error as Error).message, true);
    }
  }
  form.addEventListener("input", changed);
  form.addEventListener("change", (event) => {
    if (
      !(event.target instanceof HTMLInputElement) ||
      event.target.type !== "file"
    )
      changed();
  });
  document.getElementById("branding-preview")!.addEventListener("click", () => {
    if (form.reportValidity()) void preview();
  });
  document
    .getElementById("branding-link-add")!
    .addEventListener("click", () => {
      collect();
      if (value.links.length >= 6) return;
      value.links.push({ label: "", url: "" });
      links();
      dirty = true;
      state();
      document
        .querySelector<HTMLInputElement>(".branding-link-row:last-child input")
        ?.focus();
    });
  document
    .querySelectorAll<HTMLButtonElement>("[data-branding-reset]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const key = button.dataset.brandingReset as "logo" | "banner";
        field(key).value = brandingDefaults[key];
        changed();
      }),
    );
  document
    .querySelectorAll<HTMLInputElement>("[data-branding-upload]")
    .forEach((input) =>
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 5242880) {
          notice("La imagen supera 5 MB.", true);
          input.value = "";
          return;
        }
        const body = new FormData();
        body.set("image", file);
        input.disabled = true;
        try {
          const response = await fetch("/admin/actions/upload", {
            method: "POST",
            headers: {
              "X-CSRF-Token": document.querySelector<HTMLMetaElement>(
                'meta[name="csrf-token"]',
              )!.content,
            },
            body,
          });
          const result = await response.json();
          if (!response.ok)
            throw Error(result.message || "No se pudo cargar la imagen.");
          field(input.dataset.brandingUpload!).value = result.result.url;
          changed();
          notice(
            "Imagen cargada. Guarda la identidad para aplicarla a los correos.",
          );
        } catch (error) {
          notice((error as Error).message, true);
        } finally {
          input.disabled = false;
          input.value = "";
        }
      }),
    );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !loaded || !form.reportValidity()) return;
    collect();
    busy = true;
    state();
    form
      .querySelectorAll<
        HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement
      >("input,button,textarea")
      .forEach((node) => (node.disabled = true));
    try {
      const result = await call("mail/branding", "PUT", {
        version,
        branding: value,
      });
      version = result.version;
      value = result.branding;
      dirty = false;
      populate();
      notice(
        "Identidad guardada. Los nuevos correos usarán este logo, banner y footer.",
      );
    } catch (error) {
      notice((error as Error).message, true);
    } finally {
      busy = false;
      form
        .querySelectorAll<
          HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement
        >("input,button,textarea")
        .forEach((node) => (node.disabled = false));
      state();
      void preview();
    }
  });
  call("mail/branding")
    .then((result) => {
      value = result.branding;
      version = result.version;
      loaded = true;
      form
        .querySelectorAll<
          HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement
        >("input,button,textarea")
        .forEach((node) => (node.disabled = false));
      populate();
      void preview();
    })
    .catch(() => {
      notice("No se pudo cargar la identidad. Recarga antes de editar.", true);
    });
  return { get: () => value, dirty: () => dirty };
}
