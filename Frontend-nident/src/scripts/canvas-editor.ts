import { renderCanvas, type CanvasField } from "../lib/canvas";
const data = document.getElementById("canvas-data");
if (data) {
  const payload = JSON.parse(data.textContent!);
  const module = payload.module;
  const page = payload.page;
  const docs = payload.documents;
  let current = docs.find((d: any) => d.key === module.key);
  let values = { ...current.draft };
  let dirty = false;
  let selected = "";
  const frame = document.getElementById("site-frame") as HTMLIFrameElement;
  const save = document.getElementById("canvas-save") as HTMLButtonElement;
  const publish = document.getElementById(
    "canvas-publish",
  ) as HTMLButtonElement;
  const picker = document.getElementById("field-picker") as HTMLSelectElement;
  const csrf = document.querySelector<HTMLMetaElement>(
    'meta[name="csrf-token"]',
  )!.content;
  const feedback = (message: string, error = false) => {
    const p = document.getElementById("canvas-feedback")!;
    p.textContent = message;
    p.hidden = false;
    p.className = `notice ${error ? "error" : "success"}`;
  };
  function updatePreview() {
    const doc = frame.contentDocument;
    if (!doc) return;
    for (const field of module.fields as CanvasField[]) {
      const n =
        doc.querySelector<HTMLElement>(
          '[data-cms-fields="' + field.id + '"]',
        ) ||
        Array.from(doc.querySelectorAll<HTMLElement>("[data-cms-fields]")).find(
          (n) => n.dataset.cmsFields?.split(",").includes(field.id),
        );
      if (!n) continue;
      const value = values[field.id] ?? field.value;
      if (field.target?.attribute)
        n.setAttribute(field.target.attribute, value);
      else if (
        field.target?.textIndex !== undefined &&
        n.childNodes[field.target.textIndex]
      )
        n.childNodes[field.target.textIndex].textContent = value;
    }
  }
  frame.addEventListener("load", () => {
    const doc = frame.contentDocument;
    if (!doc) return;
    const select = (event: Event) => {
      event.preventDefault();
      const n = (event.target as Element).closest<HTMLElement>(
        "[data-cms-fields]",
      );
      const ids = n?.dataset.cmsFields
        ?.split(",")
        .filter((id) => module.fields.some((f: CanvasField) => f.id === id));
      if (ids?.length) choose(ids[0], ids);
    };
    doc.addEventListener("click", select, true);
    doc.addEventListener("submit", (event) => event.preventDefault());
    doc.querySelectorAll<HTMLElement>("[data-cms-fields]").forEach((n) => {
      n.tabIndex = 0;
      n.addEventListener("keydown", (e) => {
        if (e.key === "Enter") select(e);
      });
    });
    updatePreview();
  });
  function preview() {
    const content = Object.fromEntries(
      docs.map((d: any) => [
        d.key,
        d.key === module.key ? values : d.published,
      ]),
    );
    let body = renderCanvas(page.body, content, true).replace(
      /<script\b[\s\S]*?<\/script>/gi,
      "",
    );
    if (module.key === "encabezado")
      body = body.match(/<header\b[\s\S]*?<\/header>/)?.[0] || body;
    else if (module.key === "footer")
      body = body.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] || body;
    else
      body = body
        .replace(/<header\b[\s\S]*?<\/header>/, "")
        .replace(/<footer\b[\s\S]*?<\/footer>/, "");
    const styles = `<style>html{scroll-behavior:auto!important}body{overflow-x:hidden;min-height:90vh}.page-loader,.back-to-top,.skip-link{display:none!important}*[data-reveal],.reveal,.reveal-up{opacity:1!important;transform:none!important}*{animation:none!important;transition:none!important}[data-cms-fields]{cursor:pointer!important}[data-cms-fields]:hover,[data-cms-fields]:focus{outline:2px dashed #7258b6!important;outline-offset:4px}a,button{pointer-events:auto!important}</style>`;
    const head = page.head
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      .replace(/(href|src)="\//g, `$1="${location.origin}/`);
    body = body.replace(/(src|poster)="\//g, `$1="${location.origin}/`);
    frame.srcdoc = `<!doctype html><html lang="es"><head>${head}${styles}</head><body class="${page.bodyClass}">${body}</body></html>`;
  }
  function changed() {
    dirty = true;
    save.disabled = false;
    document.getElementById("canvas-state")!.textContent =
      "Cambios sin guardar";
    updatePreview();
  }
  function choose(id: string, ids: string[] = [id]) {
    selected = id;
    picker.value = id;
    const controls = document.getElementById("field-controls")!;
    controls.replaceChildren();
    for (const fieldId of ids) {
      const field = module.fields.find((f: CanvasField) => f.id === fieldId) as
        CanvasField | undefined;
      if (!field) continue;
      const label = document.createElement("label");
      label.textContent =
        field.type === "image"
          ? "Imagen"
          : field.type === "link"
            ? "Destino del enlace"
            : field.label;
      const input = document.createElement(
        field.type === "text" ? "textarea" : "input",
      ) as HTMLInputElement | HTMLTextAreaElement;
      input.value = values[field.id] ?? field.value;
      if (input instanceof HTMLTextAreaElement) {
        input.rows = 5;
        input.maxLength = 6000;
      } else input.type = "text";
      input.addEventListener("input", () => {
        values[field.id] = input.value;
        changed();
      });
      label.append(input);
      controls.append(label);
      if (field.type === "image") {
        const img = document.createElement("img");
        img.src = input.value;
        img.alt = "Imagen seleccionada";
        img.className = "inspector-image";
        controls.append(img);
        const uploadLabel = document.createElement("label");
        uploadLabel.textContent =
          "Subir otra imagen · JPG, PNG o WebP, hasta 5 MB";
        const upload = document.createElement("input");
        upload.type = "file";
        upload.accept = "image/jpeg,image/png,image/webp";
        uploadLabel.append(upload);
        controls.append(uploadLabel);
        upload.addEventListener("change", async () => {
          const file = upload.files?.[0];
          if (!file) return;
          if (file.size > 5242880) {
            feedback("La imagen supera 5 MB.", true);
            return;
          }
          upload.disabled = true;
          const form = new FormData();
          form.set("image", file);
          try {
            const r = await fetch("/admin/actions/upload", {
              method: "POST",
              headers: { "X-CSRF-Token": csrf },
              body: form,
            });
            const j = await r.json();
            if (!r.ok) throw Error(j.message || "No se pudo subir la imagen.");
            values[field.id] = j.result.url;
            input.value = j.result.url;
            img.src = j.result.url;
            changed();
            feedback(
              "Imagen cargada. Guarda y publica para mostrarla en la web.",
            );
          } catch (e) {
            feedback((e as Error).message, true);
          } finally {
            upload.disabled = false;
          }
        });
      }
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "text-button";
      reset.textContent = "Restaurar contenido de la plantilla";
      reset.addEventListener("click", () => {
        delete values[field.id];
        changed();
        choose(selected, ids);
      });
      controls.append(reset);
    }
  }
  picker.addEventListener("change", () => choose(picker.value));
  document.getElementById("field-search")!.addEventListener("input", (e) => {
    const text = (e.target as HTMLInputElement).value.toLocaleLowerCase();
    for (const option of picker.options)
      option.hidden =
        !!option.value && !option.text.toLocaleLowerCase().includes(text);
  });
  async function request(path: string, body: unknown, method = "PUT") {
    const r = await fetch("/admin/actions/site/modules/" + module.key + path, {
      method,
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) throw Error(j.message || "No se pudo guardar.");
    return j.result;
  }
  async function saveDraft() {
    current = await request("", { version: current.version, content: values });
    dirty = false;
    save.disabled = true;
    document.getElementById("canvas-state")!.textContent = "Borrador guardado";
  }
  save.addEventListener("click", async () => {
    save.disabled = true;
    try {
      await saveDraft();
      feedback("Borrador guardado. Puedes publicarlo cuando esté listo.");
    } catch (e) {
      feedback((e as Error).message, true);
      save.disabled = false;
    }
  });
  publish.addEventListener("click", async () => {
    publish.disabled = true;
    save.disabled = true;
    try {
      if (dirty) await saveDraft();
      current = await request("/publish", { version: current.version }, "POST");
      feedback(
        "Módulo publicado. Los cambios ya están disponibles en el sitio.",
      );
      document.getElementById("canvas-state")!.textContent = "Publicado";
    } catch (e) {
      feedback((e as Error).message, true);
    } finally {
      publish.disabled = false;
      save.disabled = !dirty;
    }
  });
  document.getElementById("module-switch")?.addEventListener("change", (e) => {
    if (
      !dirty ||
      confirm("Hay cambios sin guardar. ¿Quieres cambiar de página?")
    )
      location.href = "/admin/sitio/" + (e.target as HTMLSelectElement).value;
    else (e.target as HTMLSelectElement).value = module.key;
  });
  for (const size of ["desktop", "mobile"])
    document
      .getElementById(`preview-${size}`)!
      .addEventListener("click", () => {
        frame.classList.toggle("mobile-frame", size === "mobile");
        document
          .getElementById("preview-desktop")!
          .setAttribute("aria-pressed", String(size === "desktop"));
        document
          .getElementById("preview-mobile")!
          .setAttribute("aria-pressed", String(size === "mobile"));
      });
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  preview();
}
