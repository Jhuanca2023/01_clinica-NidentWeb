# Agenda central propuesta

La plantilla funciona sin backend. El módulo `site/js/booking.js` prueba retención de cinco minutos, confirmación, cancelación y sincronización entre pestañas usando Web Locks y almacenamiento del mismo origen. No impide conflictos entre dispositivos, perfiles o navegadores distintos. No almacena datos personales del paciente. La sesión dura 60 minutos en esta demostración; cada profesional representa un recurso exclusivo.

Para una operación real, el servidor debe ser la autoridad de disponibilidad. Se propone PostgreSQL con restricciones de exclusión por profesional y consultorio, sobre intervalos de tiempo `[inicio, fin)`, no solo una comprobación visual de fecha/hora. Así también se rechazan citas parcialmente superpuestas. Es un diseño pendiente de implementación, no una API operativa.

## Flujo

1. `GET /availability?location=trujillo&service=...&date=...`: devuelve posibilidades. No constituye una reserva.
2. `POST /holds`: recibe servicio, profesional preferido y hora. El servidor determina duración y consultorio; no acepta del cliente capacidad ni vencimiento. En una transacción libera apartados vencidos e inserta uno con vencimiento de cinco minutos según su propio reloj. Si el recurso se ocupó, responde `409 SLOT_TAKEN` y ofrece alternativas; el formulario conserva los datos.
3. La API devuelve identificador, vencimiento y un token de propietario impredecible. Se almacena solo una huella del token en el servidor. El temporizador del navegador es informativo.
4. `POST /bookings` comprueba el propietario y el vencimiento, bloquea la fila con `FOR UPDATE` y cambia el estado en la misma transacción. Un índice único sobre una clave de idempotencia del cliente evita duplicados por reintentos. La confirmación de agenda no depende del éxito de un correo posterior.
5. `DELETE /holds/:id` libera un apartado propio; su abandono se recupera por vencimiento. Una tarea periódica marca los apartados vencidos, y cada operación de reserva limpia los vencidos relevantes antes de insertar.
6. `POST /bookings/:id/cancel` requiere autorización del titular o personal. Cambia el estado a cancelado y libera el recurso. Una reprogramación adquiere la nueva franja y libera la antigua en una misma transacción; si falla, se conserva la cita original.

Una petición con «primer profesional disponible» intenta asignar un profesional y un consultorio válidos dentro de la transacción. Si pierde la carrera por uno, reintenta con otro recurso elegible. La API debe validar turnos de trabajo, feriados, descanso, especialidad, duración y margen de preparación. Se recomienda limitar tasas de solicitudes y la cantidad de apartados por sesión.

## Modelo mínimo

El archivo `reservas-schema.sql` es un ejemplo de restricciones, no una migración ejecutada ni una base completa. Requiere completar profesionales, consultorios, pacientes, autenticación y auditoría. Los rangos se guardan como `timestamptz`; se presentan en `America/Lima`. Los valores de fecha sin zona horaria del navegador no definen la hora oficial del sistema.

La limpieza de vencimientos y la inserción se deben ejecutar dentro de la transacción. La exclusión en base de datos sigue siendo la última defensa si dos solicitudes llegan al mismo tiempo. El vencimiento no se representa con `now()` en un predicado de índice: primero se cambia explícitamente el estado del apartado vencido.

## Pruebas necesarias al conectar el servidor

- Dos peticiones simultáneas para el mismo profesional y franja: exactamente una obtiene el apartado; la otra recibe 409.
- Profesionales diferentes con un único consultorio: no pueden ocupar el mismo consultorio simultáneamente.
- Rangos parcialmente solapados se rechazan; franjas adyacentes se permiten.
- Confirmación después de vencer, token incorrecto o doble confirmación: no crea otra cita.
- Reintentar con la misma clave de idempotencia devuelve la misma confirmación.
- Cancelar o vencer libera el recurso. Reprogramar sin disponibilidad conserva la cita anterior.
- «Primer disponible» no crea un recurso ficticio llamado «equipo» y respeta especialidad y consultorio.

Referencia técnica: [PostgreSQL, restricciones de rangos](https://www.postgresql.org/docs/17/rangetypes.html#RANGETYPES-CONSTRAINT).
