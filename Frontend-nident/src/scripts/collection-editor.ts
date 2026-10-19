import {
  confirmAction,
  guardUnsavedChanges,
  draftStorage,
} from "../lib/admin-interactions";
import {
  reviewMarkup,
  planMarkup,
  html,
  type CollectionItem,
  type Review,
  type Plan,
} from "../lib/content-collections";
const data = document.getElementById("collection-data");
if (data) {
  const payload = JSON.parse(data.textContent!);
  const kind = payload.kind;
  const reviews = kind === "reviews";
  let current = payload.document;
  let doc = structuredClone(current.draft) as { items: CollectionItem[] };
  let selected = doc.items[0]?.id || "";
  let dirty = false,
    busy = false;
  let showAll = false;
  let undone: { item: CollectionItem; index: number } | undefined;
  const get = <T extends HTMLElement = HTMLElement>(id: string) =>
    document.getElementById(id) as T;
  const frame = get<HTMLIFrameElement>("collection-frame");
  const csrf = document.querySelector<HTMLMetaElement>(
    'meta[name="csrf-token"]',
  )!.content;
  const recovery = draftStorage("collection:" + kind);
  const autoSlug = new Set<string>();
  const requestedPlan = new URLSearchParams(location.search).get("plan");
  if (requestedPlan && !reviews)
    selected =
      doc.items.find((item) => (item as Plan).slug === requestedPlan)?.id ||
      selected;
  const notice = (message: string, error = false) => {
    const p = get("collection-feedback");
    p.textContent = message;
    p.hidden = false;
    p.className = `notice ${error ? "error" : "success"}`;
  };
  const recovered = recovery.read(current.version);
  if (recovered?.document?.items || recovered?.items) {
    doc = recovered.document || recovered;
    dirty = true;
    selected = doc.items.some((item) => item.id === recovered.selected)
      ? recovered.selected
      : doc.items[0]?.id || "";
    notice("Recuperamos los cambios sin guardar de esta pestaña.");
  }
  guardUnsavedChanges(() => dirty);
  const active = () => doc.items.find((item) => item.id === selected);
  const viewToggle = document.createElement("button");
  viewToggle.type = "button";
  viewToggle.className = "text-button";
  viewToggle.textContent = "Ver colección";
  viewToggle.setAttribute("aria-pressed", "false");
  get("collection-app")
    .querySelector(".stage-tools span:last-child")
    ?.replaceWith(viewToggle);
  viewToggle.addEventListener("click", () => {
    showAll = !showAll;
    renderPreview();
  });
  function state() {
    get<HTMLButtonElement>("collection-save").disabled = busy || !dirty;
    get<HTMLButtonElement>("collection-publish").disabled = busy;
    get<HTMLButtonElement>("collection-add").disabled =
      busy || doc.items.length >= 50;
    get("collection-state").textContent = busy
      ? "Guardando…"
      : dirty
        ? "Cambios sin guardar"
        : "Borrador guardado";
    get("collection-count").textContent =
      `${doc.items.length} elementos · ${doc.items.filter((item) => item.visible).length} visibles`;
  }
  function change() {
    dirty = true;
    recovery.write(current.version, { document: doc, selected });
    state();
    renderList();
    renderPreview();
  }
  function renderList() {
    const list = get("collection-list");
    list.replaceChildren();
    const search =
      get<HTMLInputElement>("collection-search").value.toLocaleLowerCase();
    for (const item of doc.items) {
      const title = reviews ? (item as Review).author : (item as Plan).title;
      if (
        search &&
        !`${title} ${reviews ? (item as Review).service : ""}`
          .toLocaleLowerCase()
          .includes(search)
      )
        continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "collection-list-item";
      button.setAttribute("aria-pressed", String(item.id === selected));
      const label = document.createElement("span");
      label.textContent = title || (reviews ? "Nueva reseña" : "Nuevo plan");
      const status = document.createElement("small");
      status.textContent = item.visible ? "Visible al publicar" : "Oculto";
      button.append(label, status);
      button.disabled = busy;
      button.addEventListener("click", () => {
        selected = item.id;
        renderList();
        renderInspector();
        renderPreview();
      });
      list.append(button);
    }
    if (!list.children.length) {
      const p = document.createElement("p");
      p.className = "small-note";
      p.textContent = doc.items.length
        ? "No hay coincidencias."
        : "Empieza agregando un elemento con el botón de arriba.";
      list.append(p);
    }
  }
  function renderPreview() {
    const target = frame.contentDocument?.getElementById("collection-preview");
    if (!target) return;
    viewToggle.textContent = showAll
      ? "Ver elemento seleccionado"
      : "Ver colección";
    viewToggle.setAttribute("aria-pressed", String(showAll));
    const shown = showAll ? doc.items : active() ? [active()!] : [];
    target.innerHTML = doc.items.length
      ? `<div class="${reviews ? "reviews-track" : "plans-grid"}" style="${showAll ? "" : "grid-template-columns:minmax(0,1fr)!important"}">${shown.map((item) => (reviews ? reviewMarkup(item as Review) : planMarkup(item as Plan))).join("")}</div>`
      : '<p class="empty-preview">Todavía no hay elementos. Agrega uno para diseñar su contenido.</p>';
    for (const element of target.querySelectorAll<HTMLElement>(
      "[data-collection-id]",
    )) {
      const item = doc.items.find(
        (i) => i.id === element.dataset.collectionId,
      )!;
      element.classList.toggle("selected", item.id === selected);
      element.classList.toggle("is-hidden", !item.visible);
      element.setAttribute("tabindex", "0");
    }
    const item = active();
    if (item && !reviews && !showAll) {
      const plan = item as Plan;
      const details = document.createElement("section");
      details.className = "plan-preview-details";
      details.innerHTML = `<h2>${html(plan.title || "Información del plan")}</h2>${plan.sections.map((s) => `<section><h3>${html(s.title)}</h3><p>${html(s.body)}</p></section>`).join("")}${plan.conditions ? `<section><h3>Condiciones</h3><p>${html(plan.conditions)}</p></section>` : ""}`;
      target.append(details);
    }
  }
  const styles = `<style>body{padding:24px!important;margin:0;background:#f9f5fb!important}.page-loader{display:none!important}.reviews-track,.plans-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:20px!important;overflow:visible!important;transform:none!important}.review-card{width:auto!important;min-width:0!important;flex:none!important}.plans-grid article{padding:20px!important;min-width:0}.plans-grid article>img{align-self:stretch!important;width:100%!important;height:150px!important;object-fit:cover!important;mix-blend-mode:normal!important}.plans-grid h3{font-size:20px}.review-card{margin:0}.selected{outline:2px solid #7258b6;outline-offset:4px}.is-hidden{opacity:.5}[data-collection-id]{cursor:pointer;border-radius:14px}a{pointer-events:none}.plan-preview-details{margin-top:40px;border-top:1px solid #d6c9e6;padding-top:24px}.plan-preview-details section{margin-top:24px}.plan-preview-details p{white-space:pre-line;font-size:14px;line-height:1.8}.empty-preview{padding:30px;line-height:1.8;color:#6a6077}@media(max-width:480px){.plans-grid,.reviews-track{grid-template-columns:1fr!important}body{padding:16px!important}}</style>`;
  frame.addEventListener("load", () => {
    const page = frame.contentDocument!;
    const select = (e: Event) => {
      e.preventDefault();
      const el = (e.target as Element).closest<HTMLElement>(
        "[data-collection-id]",
      );
      if (el && !busy) {
        selected = el.dataset.collectionId!;
        showAll = false;
        renderList();
        renderInspector();
        renderPreview();
      }
    };
    page.addEventListener("click", select);
    page.addEventListener("keydown", (e) => {
      if (e.key === "Enter") select(e);
    });
    renderPreview();
  });
  frame.srcdoc = `<!doctype html><html lang="es"><head>${payload.head.replace(/<script\b[\s\S]*?<\/script>/gi, "")}${styles}</head><body class="nident"><main id="collection-preview"></main></body></html>`;
  function renderInspector() {
    showAll = false;
    if (dirty) recovery.write(current.version, { document: doc, selected });
    const item = active();
    const fields = get("collection-fields");
    fields.replaceChildren();
    get("collection-item-heading").textContent = item
      ? reviews
        ? "Editar reseña"
        : "Editar plan"
      : "Agrega tu primer elemento";
    get("item-position").textContent = item
      ? `${doc.items.findIndex((i) => i.id === selected) + 1} de ${doc.items.length}`
      : "";
    for (const id of [
      "item-before",
      "item-after",
      "item-duplicate",
      "item-remove",
    ])
      get<HTMLButtonElement>(id).disabled =
        busy ||
        !item ||
        (id === "item-before" && doc.items[0]?.id === selected) ||
        (id === "item-after" && doc.items.at(-1)?.id === selected) ||
        (id === "item-duplicate" && doc.items.length >= 50);
    if (!item) return;
    function field(key: string, labelText: string, type = "text", max = 2000) {
      const label = document.createElement("label");
      label.textContent = labelText;
      const control = document.createElement(
        type === "textarea" ? "textarea" : "input",
      ) as HTMLInputElement | HTMLTextAreaElement;
      control.name = key;
      const value = (item as any)[key];
      if (type === "checkbox") {
        (control as HTMLInputElement).type = "checkbox";
        (control as HTMLInputElement).checked = value;
        label.className = "checkbox-field";
      } else {
        if (control instanceof HTMLInputElement) control.type = type;
        if (control instanceof HTMLTextAreaElement)
          control.rows = key === "features" ? 5 : 4;
        control.value =
          key === "features" ? value.join("\n") : String(value ?? "");
        control.maxLength = max;
        if (type === "number") {
          (control as HTMLInputElement).min = "1";
          (control as HTMLInputElement).max = "5";
        }
      }
      if (
        key === "slug" &&
        current.published.items.some(
          (published: CollectionItem) => published.id === item!.id,
        )
      )
        (control as HTMLInputElement).readOnly = true;
      control.disabled = busy;
      control.addEventListener("input", () => {
        (item as any)[key] =
          type === "checkbox"
            ? (control as HTMLInputElement).checked
            : type === "number"
              ? Number(control.value)
              : key === "features"
                ? control.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : control.value;
        if (key === "slug") autoSlug.delete(item!.id);
        if (key === "title" && autoSlug.has(item!.id)) {
          const slug = control.value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 100);
          (item as Plan).slug = slug;
          const slugInput =
            fields.querySelector<HTMLInputElement>('[name="slug"]');
          if (slugInput) slugInput.value = slug;
        }
        change();
      });
      label.append(control);
      fields.append(label);
    }
    field("visible", "Mostrar al publicar", "checkbox");
    if (reviews) {
      field("author", "Nombre de la persona", "text", 100);
      field("service", "Tratamiento o categoría", "text", 120);
      field("quote", "Reseña", "textarea", 2000);
      field("rating", "Valoración de 1 a 5", "number");
      field("note", "Nota o fuente de la reseña", "text", 200);
    } else {
      field("featured", "Destacar en inicio y tratamientos", "checkbox");
      field("title", "Nombre del plan", "text", 120);
      field("slug", "Dirección de la página", "text", 100);
      const hint = document.createElement("p");
      hint.className = "small-note";
      hint.textContent =
        "Se publicará en /planes/" +
        ((item as Plan).slug || "nombre-del-plan") +
        ". La dirección se fija al publicar para conservar los enlaces.";
      fields.append(hint);
      field("summary", "Descripción breve", "textarea", 1000);
      field("price", "Precio o texto de consulta", "text", 80);
      field("price_note", "Aclaración del precio", "text", 180);
      field(
        "features",
        "Qué incluye · una inclusión por línea",
        "textarea",
        9300,
      );
      field("conditions", "Condiciones y límites", "textarea", 3000);
      field("cta", "Texto del botón de consulta", "text", 80);
    }
    field("image", "Imagen · ruta o carga de archivo", "text", 500);
    field("alt", "Descripción accesible de la imagen", "text", 200);
    const uploadLabel = document.createElement("label");
    uploadLabel.textContent = "Subir imagen · JPG, PNG o WebP, hasta 5 MB";
    const upload = document.createElement("input");
    upload.type = "file";
    upload.accept = "image/jpeg,image/png,image/webp";
    upload.disabled = busy;
    uploadLabel.append(upload);
    fields.append(uploadLabel);
    upload.addEventListener("change", async () => {
      const file = upload.files?.[0];
      if (!file) return;
      if (file.size > 5242880) {
        notice("La imagen supera 5 MB.", true);
        return;
      }
      upload.disabled = true;
      const body = new FormData();
      body.set("image", file);
      try {
        const response = await fetch("/admin/actions/upload", {
          method: "POST",
          headers: { "X-CSRF-Token": csrf },
          body,
        });
        const json = await response.json();
        if (!response.ok) throw Error(json.message);
        item!.image = json.result.url;
        change();
        renderInspector();
        notice(
          "Imagen cargada. Guarda el borrador y publica cuando esté listo.",
        );
      } catch (e) {
        notice((e as Error).message, true);
      } finally {
        upload.disabled = false;
      }
    });
    if (!reviews) {
      const plan = item as Plan;
      const title = document.createElement("h3");
      title.textContent = "Información propia de este plan";
      fields.append(title);
      plan.sections.forEach((section, index) => {
        const group = document.createElement("fieldset");
        const legend = document.createElement("legend");
        legend.textContent = "Sección " + (index + 1);
        group.append(legend);
        for (const key of ["title", "body"] as const) {
          const label = document.createElement("label");
          label.textContent =
            key === "title" ? "Título de la sección" : "Información";
          const input = document.createElement(
            key === "body" ? "textarea" : "input",
          ) as HTMLInputElement | HTMLTextAreaElement;
          input.value = section[key];
          input.maxLength = key === "title" ? 180 : 6000;
          if (input instanceof HTMLTextAreaElement) input.rows = 5;
          input.disabled = busy;
          input.addEventListener("input", () => {
            section[key] = input.value;
            change();
          });
          label.append(input);
          group.append(label);
        }
        const actions = document.createElement("div");
        actions.className = "section-editor-actions";
        for (const [label, delta] of [
          ["Subir", -1],
          ["Bajar", 1],
        ] as const) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "text-button";
          button.textContent = label;
          button.disabled =
            busy || index + delta < 0 || index + delta >= plan.sections.length;
          button.addEventListener("click", () => {
            [plan.sections[index], plan.sections[index + delta]] = [
              plan.sections[index + delta],
              plan.sections[index],
            ];
            change();
            renderInspector();
          });
          actions.append(button);
        }
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "text-button";
        remove.textContent = "Quitar sección";
        remove.disabled = busy;
        remove.addEventListener("click", async () => {
          if (
            !(await confirmAction({
              title: "Quitar sección",
              message:
                "Se quitará esta sección del borrador del plan. El contenido publicado cambia al publicar.",
              accept: "Quitar sección",
              danger: true,
            }))
          )
            return;
          plan.sections.splice(index, 1);
          change();
          renderInspector();
        });
        actions.append(remove);
        group.append(actions);
        fields.append(group);
      });
      const add = document.createElement("button");
      add.className = "secondary";
      add.type = "button";
      add.textContent = "Agregar sección de información";
      add.disabled = busy || plan.sections.length >= 20;
      add.addEventListener("click", () => {
        plan.sections.push({ title: "", body: "" });
        change();
        renderInspector();
        fields.lastElementChild?.scrollIntoView({ block: "nearest" });
      });
      fields.append(add);
    }
  }
  function refresh() {
    state();
    renderList();
    renderInspector();
    renderPreview();
  }
  get("collection-add").addEventListener("click", () => {
    if (busy || doc.items.length >= 50) return;
    const item: CollectionItem = reviews
      ? {
          id: crypto.randomUUID(),
          visible: true,
          author: "",
          service: "",
          quote: "",
          rating: 5,
          image: "",
          alt: "",
          note: "",
        }
      : {
          id: crypto.randomUUID(),
          visible: true,
          featured: true,
          title: "",
          slug: "",
          summary: "",
          image: "",
          alt: "",
          price: "",
          price_note: "",
          features: [],
          conditions: "",
          cta: "Solicitar información",
          sections: [],
        };
    doc.items.push(item);
    selected = item.id;
    if (!reviews) autoSlug.add(item.id);
    change();
    renderInspector();
    get("collection-fields")
      .querySelector<HTMLInputElement>(
        reviews ? '[name="author"]' : '[name="title"]',
      )
      ?.focus();
  });
  get("item-duplicate").addEventListener("click", () => {
    const item = active();
    if (!item || busy || doc.items.length >= 50) return;
    const copy = structuredClone(item);
    copy.id = crypto.randomUUID();
    if (reviews) (copy as Review).author += " (copia)";
    else {
      const plan = copy as Plan;
      plan.title = plan.title.slice(0, 112) + " (copia)";
      let suffix = 1;
      const root = plan.slug.slice(0, 80);
      while (
        doc.items.some((i) => (i as Plan).slug === root + "-copia-" + suffix)
      )
        suffix++;
      plan.slug = root + "-copia-" + suffix;
    }
    copy.visible = false;
    doc.items.splice(
      doc.items.findIndex((i) => i.id === selected) + 1,
      0,
      copy,
    );
    selected = copy.id;
    change();
    renderInspector();
    notice("Copia creada y oculta. Revisa su contenido antes de mostrarla.");
  });
  get("item-remove").addEventListener("click", async () => {
    const item = active();
    if (!item || busy) return;
    if (
      !(await confirmAction({
        title: reviews ? "Eliminar reseña" : "Eliminar plan",
        message:
          "Se quitará del borrador. Puedes deshacer la eliminación antes de salir. El sitio cambia cuando publiques.",
        accept: "Eliminar",
        danger: true,
      }))
    )
      return;
    const index = doc.items.indexOf(item);
    undone = { item: structuredClone(item), index };
    doc.items.splice(index, 1);
    selected = doc.items[Math.min(index, doc.items.length - 1)]?.id || "";
    get("collection-undo").hidden = false;
    change();
    renderInspector();
  });
  get("undo-remove").addEventListener("click", () => {
    if (!undone || busy || doc.items.length >= 50) return;
    doc.items.splice(undone.index, 0, undone.item);
    selected = undone.item.id;
    undone = undefined;
    get("collection-undo").hidden = true;
    change();
    renderInspector();
  });
  for (const [id, delta] of [
    ["item-before", -1],
    ["item-after", 1],
  ] as const)
    get(id).addEventListener("click", () => {
      const index = doc.items.findIndex((i) => i.id === selected),
        target = index + delta;
      if (busy || index < 0 || target < 0 || target >= doc.items.length) return;
      [doc.items[index], doc.items[target]] = [
        doc.items[target],
        doc.items[index],
      ];
      change();
      renderInspector();
    });
  get("collection-search").addEventListener("input", renderList);
  async function call(path: string, body: unknown, method = "PUT") {
    const response = await fetch(
      "/admin/actions/site/collections/" + kind + path,
      {
        method,
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify(body),
      },
    );
    const json = await response.json();
    if (!response.ok)
      throw Error(
        json.errors
          ? Object.values(json.errors).flat().join(" ")
          : json.message || "No se pudo guardar.",
      );
    return json.result;
  }
  async function save() {
    current = await call("", { version: current.version, document: doc });
    dirty = false;
    recovery.clear();
  }
  async function action(publish = false) {
    if (busy) return;
    busy = true;
    get("collection-app")
      .querySelectorAll<
        HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement
      >("input,button,textarea")
      .forEach((n) => (n.disabled = true));
    state();
    try {
      if (dirty) await save();
      if (publish) {
        current = await call("/publish", { version: current.version }, "POST");
        notice(
          "Colección publicada. Los cambios ya están disponibles en el sitio.",
        );
      } else notice("Borrador guardado. La colección publicada sigue vigente.");
    } catch (e) {
      notice((e as Error).message, true);
    } finally {
      busy = false;
      get<HTMLInputElement>("collection-search").disabled = false;
      get<HTMLButtonElement>("undo-remove").disabled = false;
      refresh();
    }
  }
  get("collection-save").addEventListener("click", () => action());
  get("collection-publish").addEventListener("click", () => action(true));
  refresh();
}
