# Nident

Web y administración en Astro SSR; API y reglas en Laravel; persistencia MySQL.

La referencia visual está en `site/`. `Frontend-nident` contiene la migración y el panel; `Backend-nident` conserva el motor reutilizable y las nuevas rutas versionadas.

Consultar [implementación y operación](Docs/IMPLEMENTACION_NIDENT.md) para iniciar, instalar migraciones Nident, configurar correos, procesar colas y conocer los módulos pendientes. La [auditoría inicial](Docs/FASE0_NIDENT.md) conserva las decisiones y riesgos del motor heredado.

No ejecutar migraciones históricas sin ruta ni copiar credenciales del proyecto anterior. Secretos y respaldos quedan fuera de Git.

## Administración por módulos

- Sliders: `/admin/sliders`. Edición visual de imagen, títulos, descripción y botón; alta, eliminación y orden hasta diez sliders. Guardar y publicar aplica la colección con control de versión.
- Lienzos: `/admin/sitio/inicio`, `/admin/sitio/tratamientos`, `/admin/sitio/nosotros`, `/admin/sitio/encabezado`, `/admin/sitio/footer`. Cada página editorial y especialidad tiene su lienzo, borrador, publicación y revisiones. Encabezado y footer se comparten.
- Imágenes: JPG, PNG y WebP de hasta 5 MB, validadas en Laravel, nombre aleatorio, almacenamiento privado y lectura pública por `/media/{nombre}`. SVG y HTML cargados no se aceptan.
- SEO y publicación de páginas: `/admin/sitio`.
- Reservas: `/reservar` registra solicitudes pendientes con consentimiento e idempotencia; `/admin/reservas` permite filtrar y gestionar estados, fecha, hora y nota interna. Requiere permiso propio. La clínica verifica disponibilidad y confirma cada cita manualmente.
- Correos: `/admin/correos`. Confirmar o cancelar una reserva conecta las plantillas correspondientes si el servicio está activo y las plantillas publicadas.

`bun run import:template` genera los lienzos desde HTML confiable. Los editores guardan valores tipados, sin aceptar scripts ni HTML arbitrario. Los identificadores generados forman parte del contrato: si se reestructura la plantilla, revisar/migrar los campos antes de importar sobre contenido editado. No ejecutar una reimportación automática en producción.

El repositorio excluye credenciales, respaldos, archivos generados, imágenes originales de trabajo y recursos/scripts públicos del proyecto heredado. El código heredado reutilizable permanece aislado en modo Nident.
