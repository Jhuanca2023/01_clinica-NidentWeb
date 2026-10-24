import {
  confirmAction,
  guardUnsavedChanges,
  draftStorage,
} from "../lib/admin-interactions";
type BlockType = "heading" | "text" | "image" | "button" | "divider";
interface Block {
  type: BlockType;
  text: string;
  url: string;
  alt: string;
}
interface MailDocument {
  subject: string;
  preheader: string;
  accent: string;
  footer: string;
  blocks: Block[];
}
interface Template {
  id: number;
  key: string;
  name: string;
  variables: string[];
  draft: MailDocument;
  version: number;
  published_version: number | null;
}

const app = document.querySelector("#mail-app");
if (app) {
  const get = <T extends HTMLElement = HTMLElement>(id: string) =>
    document.getElementById(id) as T;
  const input = (id: string) => get<HTMLInputElement>(id);
  const csrf = document.querySelector<HTMLMetaElement>(
    'meta[name="csrf-token"]',
  )!.content;
  const labels: Record<BlockType, string> = {
    heading: "Título",
    text: "Texto",
    image: "Imagen",
    button: "Botón",
    divider: "Separador",
  };
  let templates: Template[] = [];
  let current: Template;
  let doc: MailDocument;
  let selected = 0;
  let dirty = false;
  let busy = false;
  guardUnsavedChanges(() => dirty);
  let settingsVersion = 1;
  let previewController: AbortController | undefined;

  async function call(path: string, method = "GET", body?: unknown) {
    const response = await fetch(`/admin/actions/${path}`, {
      method,
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: body ? JSON.stringify(body) : undefined,
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
          : result.message || "No se pudo completar la operación.",
      );
    return result.result;
  }
  function feedback(message: string, error = false) {
    const element = get("mail-feedback");
    element.textContent = message;
    element.hidden = false;
    element.className = `notice ${error ? "error" : "success"}`;
  }
  function status() {
    get("save-state").textContent = busy
      ? "Guardando…"
      : dirty
        ? "Hay cambios sin guardar"
        : current?.published_version === current?.version
          ? "Versión publicada"
          : "Borrador guardado";
    get<HTMLButtonElement>("save-template").disabled =
      busy || !dirty || !current;
    get<HTMLButtonElement>("publish-template").disabled =
      busy ||
      dirty ||
      !current ||
      current.published_version === current.version;
  }
  function changed() {
    dirty = true;
    draftStorage("mail:" + current.id).write(current.version, doc);
    status();
    renderCanvas();
  }
  function renderLibrary() {
    const list = get("template-list");
    list.replaceChildren();
    templates.forEach((template) => {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.toggle("active", template.id === current?.id);
      button.setAttribute("aria-pressed", String(template.id === current?.id));
      const title = document.createElement("span");
      title.textContent = template.name;
      const state = document.createElement("small");
      state.textContent = template.published_version
        ? `Publicada · versión ${template.published_version}`
        : "Sin publicar";
      button.append(title, state);
      button.addEventListener("click", async () => {
        if (busy) return;
        if (
          dirty &&
          !(await confirmAction({
            title: "Cambiar de plantilla",
            message:
              "Hay cambios sin guardar en esta plantilla. Puedes seguir editando para guardarlos o abrir otra plantilla.",
            accept: "Cambiar de plantilla",
            cancel: "Seguir editando",
          }))
        )
          return;
        load(template);
      });
      list.append(button);
    });
  }
  function load(template: Template) {
    current = template;
    doc = structuredClone(template.draft);
    selected = 0;
    dirty = false;
    const recovered = draftStorage("mail:" + template.id).read(
      template.version,
    );
    if (recovered) {
      doc = recovered;
      dirty = true;
      feedback("Recuperamos los cambios sin guardar de esta plantilla.");
    }
    get("template-name").textContent = template.name;
    input("mail-subject").value = doc.subject;
    input("mail-preheader").value = doc.preheader;
    input("mail-accent").value = doc.accent;
    get<HTMLTextAreaElement>("mail-footer").value = doc.footer;
    const variables = get("variable-list");
    variables.replaceChildren();
    template.variables.forEach((variable) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `{{${variable}}}`;
      button.addEventListener("click", () => {
        if (doc.blocks[selected].type === "divider") return;
        doc.blocks[selected].text += ` {{${variable}}}`;
        changed();
        renderInspector();
      });
      variables.append(button);
    });
    renderLibrary();
    renderCanvas();
    renderInspector();
    status();
    showCanvas();
  }
  function renderCanvas() {
    const list = get("email-blocks");
    list.replaceChildren();
    (document.querySelector(".email-paper") as HTMLElement).style.setProperty(
      "--mail-accent",
      doc.accent,
    );
    get("canvas-footer").textContent = doc.footer;
    doc.blocks.forEach((block, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `canvas-block${index === selected ? " selected" : ""}`;
      button.dataset.type = block.type;
      button.setAttribute(
        "aria-label",
        `Editar ${labels[block.type].toLowerCase()}, bloque ${index + 1}`,
      );
      button.setAttribute("aria-pressed", String(index === selected));
      if (block.type === "image") {
        if (/^https:\/\//i.test(block.url)) {
          const image = document.createElement("img");
          image.src = block.url;
          image.alt = block.alt;
          image.referrerPolicy = "no-referrer";
          button.append(image);
        } else {
          const empty = document.createElement("span");
          empty.className = "canvas-image-empty";
          empty.textContent = "Añade una imagen desde un enlace HTTPS";
          button.append(empty);
        }
      } else if (block.type === "divider")
        button.append(document.createElement("hr"));
      else if (block.type === "button") {
        const content = document.createElement("span");
        content.className = "canvas-button";
        content.textContent = block.text || "Texto del botón";
        button.append(content);
      } else
        button.textContent =
          block.text ||
          (block.type === "heading"
            ? "Escribe un título"
            : "Escribe el contenido del mensaje");
      button.addEventListener("click", () => {
        selected = index;
        renderCanvas();
        renderInspector();
      });
      list.append(button);
    });
  }
  function renderInspector() {
    const block = doc.blocks[selected];
    get("block-heading").textContent =
      `${labels[block.type]} · bloque ${selected + 1}`;
    get<HTMLTextAreaElement>("block-text").value = block.text;
    input("block-url").value = block.url;
    input("block-alt").value = block.alt;
    get("block-text-label").hidden =
      block.type === "divider" || block.type === "image";
    get("block-url-label").hidden = !["button", "image"].includes(block.type);
    get("block-alt-label").hidden = block.type !== "image";
    get<HTMLButtonElement>("block-up").disabled = selected === 0;
    get<HTMLButtonElement>("block-down").disabled =
      selected === doc.blocks.length - 1;
    get<HTMLButtonElement>("block-delete").disabled = doc.blocks.length === 1;
  }
  function showCanvas() {
    get("canvas-scroll").hidden = false;
    get("mail-preview").hidden = true;
    get("show-canvas").setAttribute("aria-pressed", "true");
    get("show-preview").setAttribute("aria-pressed", "false");
  }
  get("show-canvas").addEventListener("click", showCanvas);
  get("show-preview").addEventListener("click", async () => {
    if (!current) return;
    previewController?.abort();
    previewController = new AbortController();
    const controller = previewController;
    try {
      const rendered = await call(
        `mail/templates/${current.id}/preview`,
        "POST",
        { version: current.version, document: doc },
      );
      if (controller.signal.aborted) return;
      get<HTMLIFrameElement>("mail-preview").srcdoc = rendered.html;
      get("mail-preview").hidden = false;
      get("canvas-scroll").hidden = true;
      get("show-preview").setAttribute("aria-pressed", "true");
      get("show-canvas").setAttribute("aria-pressed", "false");
    } catch (error) {
      feedback((error as Error).message, true);
    }
  });
  for (const [id, key] of Object.entries({
    "mail-subject": "subject",
    "mail-preheader": "preheader",
    "mail-accent": "accent",
    "mail-footer": "footer",
  })) {
    get(id).addEventListener("input", () => {
      (doc as any)[key] = input(id).value;
      changed();
    });
  }
  for (const key of ["text", "url", "alt"] as const)
    get(`block-${key}`).addEventListener("input", () => {
      doc.blocks[selected][key] = input(`block-${key}`).value;
      changed();
    });
  get("insert-block").addEventListener("click", () => {
    if (!current) return;
    if (doc.blocks.length >= 40) {
      feedback("Puedes incluir hasta 40 bloques por correo.", true);
      return;
    }
    const type = get<HTMLSelectElement>("add-block").value as BlockType;
    doc.blocks.splice(selected + 1, 0, {
      type,
      text:
        type === "heading"
          ? "Un nuevo título"
          : type === "button"
            ? "Ver más"
            : "",
      url: "",
      alt: "",
    });
    selected++;
    changed();
    renderInspector();
    showCanvas();
  });
  for (const [id, delta] of [
    ["block-up", -1],
    ["block-down", 1],
  ] as const)
    get(id).addEventListener("click", () => {
      const destination = selected + delta;
      if (destination < 0 || destination >= doc.blocks.length) return;
      [doc.blocks[selected], doc.blocks[destination]] = [
        doc.blocks[destination],
        doc.blocks[selected],
      ];
      selected = destination;
      changed();
      renderInspector();
    });
  get("block-delete").addEventListener("click", () => {
    if (doc.blocks.length < 2) return;
    doc.blocks.splice(selected, 1);
    selected = Math.min(selected, doc.blocks.length - 1);
    changed();
    renderInspector();
  });
  get("save-template").addEventListener("click", async () => {
    if (busy || !dirty) return;
    busy = true;
    status();
    const snapshot = structuredClone(doc);
    const version = current.version;
    try {
      const updated: Template = await call(
        `mail/templates/${current.id}`,
        "PUT",
        { version, document: snapshot },
      );
      templates = templates.map((template) =>
        template.id === updated.id ? updated : template,
      );
      current = updated;
      dirty = JSON.stringify(doc) !== JSON.stringify(snapshot);
      if (dirty) draftStorage("mail:" + current.id).write(current.version, doc);
      else draftStorage("mail:" + current.id).clear();
      renderLibrary();
      feedback("Borrador guardado. La versión publicada sigue vigente.");
    } catch (error) {
      feedback((error as Error).message, true);
    } finally {
      busy = false;
      status();
    }
  });
  get("publish-template").addEventListener("click", async () => {
    if (busy || dirty) return;
    busy = true;
    status();
    try {
      const updated: Template = await call(
        `mail/templates/${current.id}/publish`,
        "POST",
        { version: current.version },
      );
      templates = templates.map((template) =>
        template.id === updated.id ? updated : template,
      );
      current = updated;
      renderLibrary();
      feedback("Plantilla publicada. Los nuevos envíos usarán esta versión.");
    } catch (error) {
      feedback((error as Error).message, true);
    } finally {
      busy = false;
      status();
    }
  });
  get("test-template").addEventListener("click", async () => {
    const recipient = input("test-recipient");
    if (!recipient.reportValidity() || !recipient.value) {
      recipient.focus();
      return;
    }
    const button = get<HTMLButtonElement>("test-template");
    button.disabled = true;
    try {
      const result = await call(`mail/templates/${current.id}/test`, "POST", {
        recipient: recipient.value,
        request_id: crypto.randomUUID(),
      });
      feedback(
        `Prueba registrada (${result.status}). Revisa el resultado en Entregas recientes después de procesar la cola.`,
      );
    } catch (error) {
      feedback((error as Error).message, true);
    } finally {
      button.disabled = false;
    }
  });
  const settingsForm = get<HTMLFormElement>("mail-settings-form");
  async function loadSettings() {
    const settings = await call("mail/settings");
    settingsVersion = settings.version;
    for (const [key, value] of Object.entries(settings)) {
      const field = settingsForm.elements.namedItem(key) as
        HTMLInputElement | HTMLSelectElement | null;
      if (!field || key === "password") continue;
      if (field instanceof HTMLInputElement && field.type === "checkbox")
        field.checked = Boolean(value);
      else field.value = value == null ? "" : String(value);
    }
    get("password-state").textContent = settings.has_password
      ? "Ya hay una contraseña cifrada. Escribe otra para sustituirla."
      : "Todavía no hay una contraseña guardada.";
  }
  settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = settingsForm.querySelector<HTMLButtonElement>(
      "button[type=submit]",
    )!;
    button.disabled = true;
    const values = new FormData(settingsForm);
    const data: Record<string, unknown> = Object.fromEntries(values);
    data.enabled = values.has("enabled");
    data.version = settingsVersion;
    data.port = Number(data.port);
    try {
      const settings = await call("mail/settings", "PUT", data);
      settingsVersion = settings.version;
      (settingsForm.elements.namedItem("password") as HTMLInputElement).value =
        "";
      await loadSettings();
      feedback("Configuración de correo guardada.");
    } catch (error) {
      feedback((error as Error).message, true);
    } finally {
      button.disabled = false;
    }
  });
  async function loadHealth() {
    const health = await call("mail/health");
    const banner = get("mail-health");
    banner.replaceChildren();
    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = !health.enabled
      ? "Servicio desactivado"
      : health.sandbox
        ? "Mailtrap Sandbox conectado"
        : health.transport === "array"
          ? "Simulación sin envío"
          : "Servicio SMTP configurado";
    const note = document.createElement("p");
    note.textContent =
      (health.sandbox
        ? "Los mensajes se capturan en Mailtrap; no llegan a buzones reales. "
        : "") +
      health.flows.filter((f: any) => f.published).length +
      " de " +
      health.flows.length +
      " flujos publicados · " +
      health.queued +
      " en cola · " +
      health.failed +
      " con fallo.";
    content.append(title, note);
    const refresh = document.createElement("button");
    refresh.className = "secondary";
    refresh.textContent = "Actualizar estado";
    refresh.onclick = () =>
      loadHealth().catch((e) => feedback(e.message, true));
    banner.append(content, refresh);
  }
  loadHealth().catch(() => {
    get("mail-health").textContent =
      "No se pudo comprobar el servicio. Revisa la configuración.";
  });
  async function loadDeliveries() {
    const deliveries = await call("mail/deliveries");
    const container = get("delivery-list");
    container.replaceChildren();
    if (!deliveries.length) {
      const p = document.createElement("p");
      p.className = "empty-state";
      p.textContent =
        "Todavía no hay entregas. Publica una plantilla y envía una prueba para verificar tu configuración.";
      container.append(p);
      return;
    }
    const statuses: Record<string, string> = {
      pending: "Pendiente",
      queued: "En cola",
      sending: "Procesando",
      sent: "Enviado",
      simulated: "Simulado, sin envío",
      failed: "Falló",
    };
    deliveries.forEach((delivery: any) => {
      const row = document.createElement("div");
      row.className = "delivery-row";
      const name = document.createElement("span");
      name.textContent =
        templates.find((template) => template.id === delivery.template_id)
          ?.name || "Plantilla";
      const status = document.createElement("span");
      status.className = "delivery-status";
      status.textContent =
        (delivery.is_sandbox && delivery.status === "sent"
          ? "Capturado en Mailtrap"
          : statuses[delivery.status] || delivery.status) +
        (delivery.error_code ? " · " + delivery.error_code : "");
      const attempts = document.createElement("span");
      attempts.textContent = `Versión ${delivery.template_version} · ${delivery.attempts} intento(s)`;
      const date = document.createElement("time");
      date.textContent = new Date(delivery.created_at).toLocaleString("es-PE");
      row.append(name, status, attempts, date);
      container.append(row);
    });
  }
  get("refresh-deliveries").addEventListener("click", () =>
    loadDeliveries().catch((error) => feedback(error.message, true)),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) =>
    button.addEventListener("click", async () => {
      document.querySelectorAll("[data-panel]").forEach((panel) => {
        (panel as HTMLElement).hidden =
          (panel as HTMLElement).dataset.panel !== button.dataset.tab;
      });
      document
        .querySelectorAll<HTMLButtonElement>("[data-tab]")
        .forEach((tab) => {
          tab.classList.toggle("active", tab === button);
          tab.setAttribute("aria-pressed", String(tab === button));
        });
      document
        .querySelector(".editor-toolbar")
        ?.classList.toggle("invisible", button.dataset.tab !== "templates");
      try {
        if (button.dataset.tab === "settings") await loadSettings();
        if (button.dataset.tab === "deliveries") await loadDeliveries();
      } catch (error) {
        feedback((error as Error).message, true);
      }
    }),
  );
  call("mail/templates")
    .then((result) => {
      templates = result;
      if (templates.length) load(templates[0]);
      else {
        get("save-state").textContent =
          "No hay plantillas. Ejecuta la instalación Nident.";
      }
    })
    .catch((error) => {
      get("save-state").textContent = "No se pudieron cargar las plantillas";
      feedback(error.message, true);
    });
}
