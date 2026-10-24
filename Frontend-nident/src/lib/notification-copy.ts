export function notificationCopy(value?: {
  status: string;
  sandbox?: boolean;
}): string {
  if (!value) return "Conserva tu referencia para consultar el estado.";
  const status = value.status;
  if (status === "sent")
    return value.sandbox
      ? "Correo aceptado por Mailtrap en modo de pruebas. No se entrega al buzón real."
      : "El correo fue aceptado por el servidor de envío.";
  if (status === "simulated")
    return "El correo se simuló para pruebas; no se entregó a un buzón.";
  if (["pending", "queued", "sending"].includes(status))
    return "Tu acuse está en cola de envío. Puedes revisar su estado con la referencia.";
  if (status === "failed")
    return "No se pudo enviar el correo. Tu solicitud permanece registrada y puedes consultar su estado.";
  return "El acuse por correo no está habilitado para esta solicitud. Conserva la referencia.";
}
