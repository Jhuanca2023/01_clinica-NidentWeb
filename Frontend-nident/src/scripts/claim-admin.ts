import { claimLabel, claimProgress } from "../lib/claims";
import { guardUnsavedChanges } from "../lib/admin-interactions";
const app = document.getElementById("claim-detail");
if (app) {
  const form = document.getElementById(
    "claim-management-form",
  ) as HTMLFormElement;
  const fields = form.querySelector("fieldset")!;
  const csrf = document.querySelector<HTMLMetaElement>(
    'meta[name="csrf-token"]',
  )!.content;
  let version = Number(app.dataset.version),
    dirty = false,
    busy = false;
  guardUnsavedChanges(() => dirty);
  const status = form.elements.namedItem("status") as HTMLSelectElement;
  const outcome = form.elements.namedItem("outcome") as HTMLSelectElement;
  const response = form.elements.namedItem("response") as HTMLTextAreaElement;
  function controls() {
    document.getElementById("claim-outcome-field")!.hidden =
      status.value !== "answered";
    response.required = status.value === "answered";
  }
  status.addEventListener("change", controls);
  form.addEventListener("input", () => {
    dirty = true;
  });
  form.addEventListener("change", () => {
    dirty = true;
  });
  async function call(path: string, method: string, body: unknown = {}) {
    const result = await fetch(
      "/admin/actions/claims/" + app!.dataset.id + path,
      {
        method,
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify(body),
      },
    );
    const data = await result.json();
    if (!result.ok)
      throw Error(
        data.errors
          ? Object.values(data.errors).flat().join(" ")
          : data.message || "No se pudo actualizar la solicitud.",
      );
    return data.result;
  }
  async function open() {
    const feedback = document.getElementById("claim-open-state")!;
    const retry = document.getElementById("claim-open-retry")!;
    retry.hidden = true;
    try {
      const claim = await call("/open", "POST");
      version = claim.version;
      const badge = document.getElementById("claim-status")!;
      badge.textContent = claimLabel(claim.status, claim.outcome);
      badge.className =
        "claim-state " +
        (claim.outcome === "rejected" ? "rejected" : claim.status);
      document.getElementById("claim-progress")!.innerHTML = claimProgress(
        claim.status,
        {
          registered_at: claim.created_at,
          reviewing_at: claim.reviewing_at,
          answered_at: claim.answered_at,
        },
      );
      status.value = claim.status === "answered" ? "answered" : "reviewing";
      if (claim.status === "answered")
        status.querySelector<HTMLOptionElement>("[value=reviewing]")!.disabled =
          true;
      outcome.value = claim.outcome || "resolved";
      response.value = claim.response || "";
      feedback.textContent =
        claim.status === "answered"
          ? "Esta solicitud ya tiene un resultado registrado."
          : "Solicitud en revisión. Este avance ya está disponible en la consulta del cliente.";
      fields.disabled = false;
      controls();
    } catch (error) {
      feedback.textContent = (error as Error).message;
      feedback.className = "notice error";
      retry.hidden = false;
    }
  }
  document
    .getElementById("claim-open-retry")!
    .addEventListener("click", () => void open());
  void open();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const body: any = { ...Object.fromEntries(new FormData(form)), version };
    if (status.value !== "answered") delete body.outcome;
    busy = true;
    fields.disabled = true;
    const feedback = document.getElementById("claim-save-feedback")!;
    try {
      await call("", "PUT", body);
      dirty = false;
      location.reload();
    } catch (error) {
      feedback.hidden = false;
      feedback.className = "notice error";
      feedback.textContent = (error as Error).message;
      fields.disabled = false;
      busy = false;
    }
  });
}
