const data = document.getElementById("slider-data");
if (data) {
  const settings = JSON.parse(data.textContent!);
  const slides = settings.content.hero;
  let index = 0,
    dirty = false;
  const csrf = document.querySelector<HTMLMetaElement>(
    'meta[name="csrf-token"]',
  )!.content;
  const labels: Record<string, string> = {
    title: "Primera línea",
    line: "Segunda línea",
    description: "Descripción",
    image: "Imagen",
    alt: "Descripción accesible de imagen",
    cta: "Texto del botón",
    url: "Destino del botón",
  };
  const save = document.getElementById("save-slides") as HTMLButtonElement;
  const notice = (message: string, error = false) => {
    const n = document.getElementById("slider-feedback")!;
    n.hidden = false;
    n.textContent = message;
    n.className = `notice ${error ? "error" : "success"}`;
  };
  function changed() {
    dirty = true;
    save.disabled = false;
    document.getElementById("slider-state")!.textContent =
      "Cambios sin publicar";
    paint();
  }
  function paint() {
    const slide = slides[index];
    (document.getElementById("slider-image") as HTMLImageElement).src =
      slide.image;
    for (const key of ["title", "line", "description", "cta"])
      document.getElementById("slide-" + key)!.textContent = slide[key];
    const list = document.getElementById("slide-list")!;
    list.replaceChildren();
    slides.forEach((s: any, i: number) => {
      const button = document.createElement("button");
      button.className = "slide-thumbnail";
      button.setAttribute("aria-pressed", String(i === index));
      const img = document.createElement("img");
      img.src = s.image;
      img.alt = "";
      const text = document.createElement("span");
      text.textContent = `${i + 1}. ${s.title}`;
      button.append(img, text);
      button.addEventListener("click", () => {
        index = i;
        render();
      });
      list.append(button);
    });
    (document.getElementById("new-slide") as HTMLButtonElement).disabled =
      slides.length >= 10;
    (document.getElementById("slide-prev") as HTMLButtonElement).disabled =
      index === 0;
    (document.getElementById("slide-next") as HTMLButtonElement).disabled =
      index === slides.length - 1;
    (document.getElementById("slide-remove") as HTMLButtonElement).disabled =
      slides.length === 1;
  }
  function render() {
    paint();
    const fields = document.getElementById("slide-fields")!;
    fields.replaceChildren();
    for (const [key, title] of Object.entries(labels)) {
      const label = document.createElement("label");
      label.textContent = title;
      const input = document.createElement(
        key === "description" ? "textarea" : "input",
      ) as HTMLInputElement | HTMLTextAreaElement;
      input.id = "slider-field-" + key;
      input.value = slides[index][key];
      input.required = true;
      input.maxLength =
        key === "image" || key === "url"
          ? 500
          : key === "description"
            ? 250
            : key === "alt"
              ? 200
              : 100;
      input.addEventListener("input", () => {
        slides[index][key] = input.value;
        changed();
      });
      label.append(input);
      fields.append(label);
      if (key === "image") {
        const fileLabel = document.createElement("label");
        fileLabel.textContent = "Subir imagen · hasta 5 MB";
        const file = document.createElement("input");
        file.type = "file";
        file.accept = "image/jpeg,image/png,image/webp";
        fileLabel.append(file);
        fields.append(fileLabel);
        file.addEventListener("change", async () => {
          if (!file.files?.[0]) return;
          const image = file.files[0];
          if (image.size > 5242880) {
            notice("La imagen supera 5 MB.", true);
            return;
          }
          file.disabled = true;
          const body = new FormData();
          body.set("image", image);
          try {
            const response = await fetch("/admin/actions/upload", {
              method: "POST",
              headers: { "X-CSRF-Token": csrf },
              body,
            });
            const json = await response.json();
            if (!response.ok)
              throw Error(json.message || "No se pudo subir la imagen.");
            slides[index].image = json.result.url;
            input.value = json.result.url;
            changed();
            notice("Imagen cargada. Guarda y publica los cambios.");
          } catch (e) {
            notice((e as Error).message, true);
          } finally {
            file.disabled = false;
          }
        });
      }
    }
  }
  document
    .querySelectorAll<HTMLButtonElement>("[data-slide-field]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        document
          .getElementById("slider-field-" + b.dataset.slideField)
          ?.focus(),
      ),
    );
  document.getElementById("new-slide")!.addEventListener("click", () => {
    if (slides.length >= 10) return;
    slides.push({
      ...slides[index],
      title: "Nuevo slider",
      line: "Escribe tu mensaje",
    });
    index = slides.length - 1;
    changed();
    render();
  });
  document.getElementById("slide-remove")!.addEventListener("click", () => {
    if (
      slides.length <= 1 ||
      !confirm(
        "¿Eliminar este slider? El cambio se aplica al guardar y publicar.",
      )
    )
      return;
    slides.splice(index, 1);
    index = Math.min(index, slides.length - 1);
    changed();
    render();
  });
  for (const [id, delta] of [
    ["slide-prev", -1],
    ["slide-next", 1],
  ] as const)
    document.getElementById(id)!.addEventListener("click", () => {
      const target = index + delta;
      if (target < 0 || target >= slides.length) return;
      [slides[index], slides[target]] = [slides[target], slides[index]];
      index = target;
      changed();
      render();
    });
  save.addEventListener("click", async () => {
    if (
      !document
        .querySelector<HTMLInputElement>(
          "#slide-fields input:invalid,#slide-fields textarea:invalid",
        )
        ?.reportValidity() &&
      document.querySelector("#slide-fields :invalid")
    )
      return;
    save.disabled = true;
    try {
      const r = await fetch("/admin/actions/site/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify(settings),
      });
      const json = await r.json();
      if (!r.ok)
        throw Error(
          json.errors
            ? Object.values(json.errors).flat().join(" ")
            : json.message,
        );
      settings.version = json.result.version;
      dirty = false;
      document.getElementById("slider-state")!.textContent =
        `${slides.length} sliders publicados`;
      notice("Sliders publicados en el inicio.");
    } catch (e) {
      notice((e as Error).message, true);
    } finally {
      save.disabled = !dirty;
    }
  });
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  render();
}
