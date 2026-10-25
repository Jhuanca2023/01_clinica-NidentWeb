export function initClaimWizard(form: HTMLFormElement) {
  let step = 0;
  const panels = Array.from(
    form.querySelectorAll<HTMLElement>("[data-claim-step]"),
  );
  const progress = Array.from(
    document.querySelectorAll<HTMLElement>("[data-claim-progress]"),
  );
  const back = document.getElementById("claim-step-back") as HTMLButtonElement,
    next = document.getElementById("claim-step-next") as HTMLButtonElement,
    submit = document.getElementById("claim-submit") as HTMLButtonElement;
  function paint(focus = false) {
    panels.forEach((panel, index) => (panel.hidden = index !== step));
    progress.forEach((item, index) => {
      item.classList.toggle("current", index === step);
      if (index === step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    back.hidden = step === 0;
    next.hidden = step === 2;
    submit.hidden = step !== 2;
    if (focus) {
      const heading = panels[step].querySelector("legend")!;
      heading.setAttribute("tabindex", "-1");
      heading.focus();
    }
  }
  function advance() {
    for (const control of panels[step].querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input,select,textarea"))
      if (!control.checkValidity()) {
        control.reportValidity();
        return;
      }
    step = Math.min(2, step + 1);
    paint(true);
  }
  next.addEventListener("click", advance);
  back.addEventListener("click", () => {
    step = Math.max(0, step - 1);
    paint(true);
  });
  form.addEventListener(
    "submit",
    (event) => {
      if (step < 2) {
        event.preventDefault();
        event.stopImmediatePropagation();
        advance();
      }
    },
    true,
  );
  form.addEventListener("reset", () => {
    step = 0;
    paint();
  });
  paint();
}
