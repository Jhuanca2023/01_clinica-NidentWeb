import { confirmAction, guardUnsavedChanges } from "../lib/admin-interactions";
const element = document.getElementById("security-data");
if (element) {
  const { type, data, me } = JSON.parse(element.textContent!);
  let selected: any = null,
    dirty = false,
    busy = false;
  const get = (id: string) => document.getElementById(id)!;
  const form = get("security-form") as HTMLFormElement;
  const csrf = document.querySelector<HTMLMetaElement>(
    'meta[name="csrf-token"]',
  )!.content;
  const singular =
    type === "users" ? "usuario" : type === "profiles" ? "perfil" : "rol";
  guardUnsavedChanges(() => dirty);
  const notice = (text: string, error = false) => {
    const node = get("security-feedback");
    node.hidden = false;
    node.textContent = text;
    node.className = `notice ${error ? "error" : "success"}`;
  };
  function list() {
    const tbody = get("security-list");
    tbody.replaceChildren();
    const query = (
      get("security-search") as HTMLInputElement
    ).value.toLowerCase();
    let count = 0;
    for (const row of data[type]) {
      if (!`${row.name} ${row.email || ""}`.toLowerCase().includes(query))
        continue;
      count++;
      const tr = document.createElement("tr");
      const main = document.createElement("td");
      const title = document.createElement("strong");
      title.textContent = row.name;
      main.append(title);
      if (row.email) {
        const small = document.createElement("small");
        small.textContent = row.email;
        main.append(small);
      }
      if (row.principal) {
        const small = document.createElement("small");
        small.textContent = "Administrador principal";
        main.append(small);
      }
      const detail = document.createElement("td");
      detail.textContent =
        type === "users"
          ? row.profile_ids
              .map(
                (id: number) =>
                  data.profiles.find((p: any) => p.id === id)?.name || "",
              )
              .filter(Boolean)
              .join(", ") || "Sin perfil"
          : type === "profiles"
            ? row.role_ids
                .map(
                  (id: number) =>
                    data.roles.find((r: any) => r.id === id)?.name || "",
                )
                .filter(Boolean)
                .join(", ") || "Sin roles"
            : row.permissions
                .map((area: string) => data.areas[area])
                .join(", ") || "Sin módulos";
      const status = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `status-pill ${row.active ? "active" : "disabled"}`;
      badge.textContent = row.active ? "Activo" : "Inactivo";
      status.append(badge);
      const actions = document.createElement("td");
      const button = document.createElement("button");
      button.className = "text-button";
      button.type = "button";
      button.textContent = "Editar";
      button.addEventListener("click", () => choose(row));
      actions.append(button);
      tr.append(main, detail, status, actions);
      tbody.append(tr);
    }
    get("security-count").textContent = count + " registros";
  }
  async function choose(row: any) {
    if (busy) return;
    if (
      dirty &&
      !(await confirmAction({
        title: "Cambiar de registro",
        message:
          "Hay cambios sin guardar en este formulario. ¿Quieres descartarlos para abrir otro registro?",
        accept: "Cambiar de registro",
        cancel: "Seguir editando",
      }))
    )
      return;
    selected = row ? structuredClone(row) : null;
    dirty = false;
    render();
  }
  function input(
    name: string,
    labelText: string,
    value: string,
    type = "text",
    required = false,
  ) {
    const label = document.createElement("label");
    label.textContent = labelText;
    const field = document.createElement("input");
    field.name = name;
    field.type = type;
    field.value = value;
    field.required = required;
    field.maxLength = type === "password" ? 128 : 180;
    if (type === "password") {
      field.minLength = name === "current_password" ? 1 : 12;
      field.autocomplete =
        name === "current_password" ? "current-password" : "new-password";
    }
    label.append(field);
    form.append(label);
  }
  function checkbox(
    name: string,
    labelText: string,
    checked: boolean,
    disabled = false,
  ) {
    const label = document.createElement("label");
    label.className = "checkbox-field";
    const field = document.createElement("input");
    field.type = "checkbox";
    field.name = name;
    field.checked = checked;
    field.disabled = disabled;
    label.append(field, document.createTextNode(labelText));
    form.append(label);
  }
  function choices(
    name: string,
    title: string,
    options: { id: string | number; name: string; active?: boolean }[],
    values: (string | number)[],
  ) {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "assignment-options";
    const legend = document.createElement("legend");
    legend.textContent = title;
    fieldset.append(legend);
    for (const option of options) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = name;
      input.value = String(option.id);
      input.checked = values.some(
        (value) => String(value) === String(option.id),
      );
      label.append(
        input,
        document.createTextNode(
          option.name + (option.active === false ? " · inactivo" : ""),
        ),
      );
      fieldset.append(label);
    }
    form.append(fieldset);
  }
  function render() {
    form.replaceChildren();
    get("security-title").textContent = selected
      ? "Editar " + singular
      : "Nuevo " + singular;
    get("security-help").textContent =
      type === "users"
        ? "Una cuenta inactiva no puede entrar. La administración de usuarios está reservada al administrador principal."
        : type === "profiles"
          ? "Un perfil reúne roles. Los cambios afectan al personal que utiliza ese perfil."
          : "Los permisos se aplican a través de los perfiles. Puedes exigir verificación en dos pasos.";
    input("name", "Nombre", selected?.name || "", "text", true);
    checkbox(
      "active",
      "Registro activo",
      selected?.active ?? true,
      !!selected?.principal,
    );
    if (type === "users") {
      input("email", "Correo de acceso", selected?.email || "", "email", true);
      input(
        "password",
        selected
          ? "Nueva contraseña · deja vacío para conservar"
          : "Contraseña inicial · mínimo 12 caracteres",
        "",
        "password",
        !selected,
      );
      input(
        "password_confirmation",
        "Repetir contraseña",
        "",
        "password",
        !selected,
      );
      if (selected?.id === me.id)
        input(
          "current_password",
          "Contraseña actual · solo si vas a cambiarla",
          "",
          "password",
        );
      choices(
        "profile_ids",
        "Perfiles asignados",
        data.profiles,
        selected?.profile_ids || [],
      );
      const note = document.createElement("p");
      note.className = "small-note";
      note.textContent =
        "Entrega la contraseña inicial al personal por un canal seguro. No se publica ni se envía automáticamente.";
      form.append(note);
    } else if (type === "profiles")
      choices(
        "role_ids",
        "Roles del perfil",
        data.roles,
        selected?.role_ids || [],
      );
    else {
      checkbox(
        "require_2fa",
        "Exigir verificación en dos pasos",
        selected?.require_2fa ?? false,
      );
      choices(
        "permissions",
        "Módulos permitidos",
        Object.entries(data.areas).map(([id, name]) => ({
          id,
          name: String(name),
        })),
        selected?.permissions || [],
      );
    }
    const actions = document.createElement("div");
    actions.className = "form-actions";
    const save = document.createElement("button");
    save.type = "submit";
    save.className = "primary";
    save.textContent = selected ? "Guardar cambios" : "Crear " + singular;
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "secondary";
    cancel.textContent = "Limpiar formulario";
    cancel.addEventListener("click", () => choose(null));
    actions.append(save, cancel);
    form.append(actions);
  }
  form.addEventListener("input", () => {
    dirty = true;
  });
  form.addEventListener("change", () => {
    dirty = true;
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const fields = new FormData(form);
    const body: any = {
      name: fields.get("name"),
      active: (form.elements.namedItem("active") as HTMLInputElement).checked,
    };
    if (selected) body.version = selected.version;
    if (type === "users") {
      body.email = fields.get("email");
      body.profile_ids = fields.getAll("profile_ids").map(Number);
      if (fields.get("password")) {
        body.password = fields.get("password");
        body.password_confirmation = fields.get("password_confirmation");
        body.current_password = fields.get("current_password");
      }
    } else if (type === "profiles")
      body.role_ids = fields.getAll("role_ids").map(Number);
    else {
      body.permissions = fields.getAll("permissions");
      body.require_2fa = (
        form.elements.namedItem("require_2fa") as HTMLInputElement
      ).checked;
    }
    busy = true;
    form
      .querySelectorAll<HTMLInputElement | HTMLButtonElement>("input,button")
      .forEach((node) => (node.disabled = true));
    try {
      const response = await fetch(
        "/admin/actions/security/" + type + (selected ? "/" + selected.id : ""),
        {
          method: selected ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
          body: JSON.stringify(body),
        },
      );
      const json = await response.json();
      if (!response.ok)
        throw Error(
          json.errors
            ? Object.values(json.errors).flat().join(" ")
            : json.message,
        );
      dirty = false;
      if (json.result.reauthenticate) {
        const logout = document.createElement("form");
        logout.method = "POST";
        logout.action = "/admin/salir";
        const token = document.createElement("input");
        token.type = "hidden";
        token.name = "_csrf";
        token.value = csrf;
        logout.append(token);
        document.body.append(logout);
        logout.submit();
        return;
      }
      const refreshed = await fetch("/admin/actions/security");
      if (!refreshed.ok)
        throw Error("El cambio se guardó. Recarga para ver la lista.");
      Object.assign(data, (await refreshed.json()).result);
      selected =
        data[type].find((row: any) => row.id === json.result.id) || null;
      notice("Registro guardado. Los accesos ya están actualizados.");
      list();
      render();
    } catch (error) {
      notice((error as Error).message, true);
      form
        .querySelectorAll<HTMLInputElement | HTMLButtonElement>("input,button")
        .forEach((node) => (node.disabled = false));
      if (selected?.principal)
        (form.elements.namedItem("active") as HTMLInputElement).disabled = true;
    } finally {
      busy = false;
    }
  });
  get("security-new").addEventListener("click", () => choose(null));
  get("security-search").addEventListener("input", list);
  list();
  render();
}
