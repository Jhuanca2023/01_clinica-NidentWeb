import { canvasPages as pages, renderCanvas } from "../canvas";
import { api } from "./api";
import { applyCollections } from "./collections";

function escape(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}

export async function publicSite(path: string) {
  let site: any;
  let error = false;
  try {
    site = (await api("/public/site")).result;
  } catch {
    error = true;
  }
  const metadata = site?.pages.find((item: any) => item.path === path);
  const page = pages.find((item) => item.source === metadata?.source);
  const content = site?.content;
  let body = renderCanvas(page?.body || "", site?.modules || {});
  body = applyCollections(body, site?.collections);
  if (path === "/contacto") {
    body = body.replace(
      "Formulario de demostración: el mensaje se prepara en pantalla, no se envía ni se almacena. Usa datos de prueba.",
      "Tu consulta se registra en Nident para que el equipo pueda atenderla. No incluyas información clínica sensible.",
    );
    body = body.replace(
      '<form id="inquiry-form" novalidate>',
      '<form id="inquiry-form" data-api-contact novalidate>',
    );
    body = body.replace(
      "Al preparar tu consulta, los datos permanecen en esta página.",
      "Al enviar tu mensaje, la clínica lo recibirá para atender tu consulta.",
    );
    body = body.replace(
      '<p id="inquiry-error"',
      '<label class="contact-consent"><input type="checkbox" name="acepto_privacidad" value="1" required><span>He leído y acepto la política de privacidad.</span></label><label aria-hidden="true" style="position:absolute;left:-9999px">Sitio web<input name="website" tabindex="-1" autocomplete="off"></label><p id="inquiry-error"',
    );
    body = body.replace("Preparar mi consulta", "Enviar mi consulta");
  }
  if (path === "/privacidad") {
    body = body.replace(
      "La maqueta no tiene un servidor de atención, correo de recepción ni archivo de reclamaciones. Las pruebas deben hacerse con datos ficticios. Para operar el servicio deberán configurarse el responsable, las finalidades, la conservación, la seguridad y los canales de atención correspondientes.",
      "Los formularios de contacto y reservas registran tus datos de contacto y tu solicitud en el servidor Nident para atenderla. El acceso está restringido al personal autorizado. Las solicitudes de cita requieren confirmación de la clínica. El correo depende de que el servicio esté configurado y su plantilla publicada. El Libro de Reclamaciones sigue siendo una demostración local. Antes de abrir el servicio al público deben completarse la identificación del responsable, los canales de atención y los plazos de conservación.",
    );
  }
  if (content) {
    body = body.replace(
      /\/assets\/img\/marca\/logo1-trim\.webp/g,
      escape(content.logo),
    );
    body = body.replace(
      /hola@nident\.example/g,
      escape(content.email || "Correo pendiente de configurar"),
    );
    if (content.phone)
      body = body.replace(
        /Atención con cita previa/g,
        `<a href="tel:${escape(content.phone.replace(/[^+0-9]/g, ""))}">${escape(content.phone)}</a><br>Atención con cita previa`,
      );
    body = body.replace(
      "Sonríe a tu manera.<br>Te acompañamos.",
      escape(content.tagline),
    );
  }
  const hero = body.match(/<section class="n-hero"[\s\S]*?<\/section>/)?.[0];
  return {
    page,
    metadata,
    content,
    collections: site?.collections,
    error,
    hero,
    parts: hero ? body.split(hero) : [body],
  };
}
