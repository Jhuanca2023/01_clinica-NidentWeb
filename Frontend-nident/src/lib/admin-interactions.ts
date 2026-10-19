type ConfirmOptions = {
  title: string;
  message: string;
  accept?: string;
  cancel?: string;
  danger?: boolean;
};
let pending = false;
export async function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (pending) return false;
  pending = true;
  const previous = document.activeElement as HTMLElement | null;
  const dialog = document.createElement("dialog");
  dialog.className = "admin-confirm";
  const title = document.createElement("h2");
  title.id = "confirmation-title";
  title.textContent = options.title;
  const message = document.createElement("p");
  message.id = "confirmation-message";
  message.textContent = options.message;
  dialog.setAttribute("aria-labelledby", title.id);
  dialog.setAttribute("aria-describedby", message.id);
  const actions = document.createElement("div");
  actions.className = "confirmation-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "secondary";
  cancel.textContent = options.cancel || "Cancelar";
  const accept = document.createElement("button");
  accept.type = "button";
  accept.className = options.danger ? "danger" : "primary";
  accept.textContent = options.accept || "Continuar";
  actions.append(cancel, accept);
  dialog.append(title, message, actions);
  document.body.append(dialog);
  return new Promise((resolve) => {
    let done = false;
    const finish = (value: boolean) => {
      if (done) return;
      done = true;
      dialog.close();
      dialog.remove();
      pending = false;
      previous?.focus();
      resolve(value);
    };
    cancel.addEventListener("click", () => finish(false));
    accept.addEventListener("click", () => finish(true));
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      finish(false);
    });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        )
          finish(false);
      }
    });
    dialog.showModal();
    cancel.focus();
  });
}
export function guardUnsavedChanges(isDirty: () => boolean) {
  const allow = () =>
    !isDirty()
      ? Promise.resolve(true)
      : confirmAction({
          title: "Tienes cambios sin guardar",
          message:
            "Puedes seguir editando y guardar tus cambios antes de salir, o abandonar la página sin guardarlos en el servidor.",
          accept: "Salir sin guardar",
          cancel: "Seguir editando",
        });
  let leaving = false;
  document.addEventListener(
    "click",
    async (event) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (
        !link ||
        leaving ||
        !isDirty() ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === "_blank" ||
        link.hasAttribute("download")
      )
        return;
      const url = new URL(link.href, location.href);
      if (
        !/^https?:$/.test(url.protocol) ||
        (url.pathname === location.pathname &&
          url.search === location.search &&
          url.origin === location.origin)
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (await allow()) {
        leaving = true;
        location.assign(url.href);
      }
    },
    true,
  );
  document.addEventListener(
    "submit",
    async (event) => {
      const form = event.target as HTMLFormElement;
      if (leaving || !isDirty() || !form.action.endsWith("/admin/salir"))
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (await allow()) {
        leaving = true;
        form.requestSubmit();
      }
    },
    true,
  );
  // A same-document history entry lets Back use the panel's confirmation as well.
  if (!history.state?.nidentEditorGuard) {
    const initial = { ...history.state };
    delete initial.nidentEditorBase;
    delete initial.nidentEditorGuard;
    history.replaceState({ ...initial, nidentEditorBase: true }, "");
    history.pushState({ ...initial, nidentEditorGuard: true }, "");
  }
  window.addEventListener("pageshow", () => {
    leaving = false;
  });
  window.addEventListener("popstate", async (event) => {
    if (
      leaving ||
      event.state?.nidentEditorGuard ||
      !event.state?.nidentEditorBase
    )
      return;
    if (await allow()) {
      leaving = true;
      history.back();
    } else history.pushState({ nidentEditorGuard: true }, "");
  });
  return { allow };
}
export function draftStorage(key: string) {
  const scope =
    document
      .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
      ?.content.slice(0, 16) || "anonymous";
  const name = `nident:draft:${scope}:${key}`;
  return {
    read(version: number): any | undefined {
      try {
        const cached = JSON.parse(sessionStorage.getItem(name) || "null");
        if (cached?.version === version) return cached.value;
        if (cached) sessionStorage.removeItem(name);
      } catch {}
    },
    write(version: number, value: unknown) {
      try {
        sessionStorage.setItem(name, JSON.stringify({ version, value }));
      } catch {}
    },
    clear() {
      try {
        sessionStorage.removeItem(name);
      } catch {}
    },
  };
}
