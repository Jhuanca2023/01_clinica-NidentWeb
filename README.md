# Nident

Web y administración en Astro SSR; API y reglas en Laravel; persistencia MySQL.

La referencia visual está en `site/`. `Frontend-nident` contiene la migración y el panel; `Backend-nident` conserva el motor reutilizable y las nuevas rutas versionadas.

Consultar [implementación y operación](Docs/IMPLEMENTACION_NIDENT.md) para iniciar, instalar migraciones Nident, configurar correos, procesar colas y conocer los módulos pendientes. La [auditoría inicial](Docs/FASE0_NIDENT.md) conserva las decisiones y riesgos del motor heredado.

No ejecutar migraciones históricas sin ruta ni copiar credenciales del proyecto anterior. Secretos y respaldos quedan fuera de Git.

## Administración por módulos

- Dashboard: `/admin`. Series de solicitudes, estados, sedes, próximas citas, mensajes y correos. Períodos de 7, 30 o 90 días, datos de MySQL y acceso por permisos. No se simulan visitas ni ingresos.
- Reseñas: `/admin/resenas`. Crear, editar, duplicar, ordenar, ocultar y eliminar con opción de deshacer; imagen, valoración y nota propias. Borrador privado y publicación de la colección.
- Planes: `/admin/planes`. Crear planes con imágenes, precio o texto de consulta, inclusiones, condiciones y hasta veinte secciones independientes. Elegir destacados para inicio/tratamientos. Cada plan visible tiene página `/planes/{slug}` y la reserva conserva el plan elegido. La dirección se fija al publicar; los enlaces antiguos `/packs/{slug}` redirigen a la nueva página.
- Sliders: `/admin/sliders`. Edición visual de imagen, títulos, descripción y botón; alta, eliminación y orden hasta diez sliders. Guardar y publicar aplica la colección con control de versión.
- Lienzos: `/admin/sitio/inicio`, `/admin/sitio/tratamientos`, `/admin/sitio/nosotros`, `/admin/sitio/encabezado`, `/admin/sitio/footer`. Cada página editorial y especialidad tiene su lienzo, borrador, publicación y revisiones. Encabezado y footer se comparten.
- Imágenes: JPG, PNG y WebP de hasta 5 MB, validadas en Laravel, nombre aleatorio, almacenamiento privado y lectura pública por `/media/{nombre}`. SVG y HTML cargados no se aceptan.
- SEO y publicación de páginas: `/admin/sitio`.
- Reservas: `/reservar` registra solicitudes pendientes con consentimiento e idempotencia; `/admin/reservas` permite filtrar y gestionar estados, fecha, hora y nota interna. Requiere permiso propio. La clínica verifica disponibilidad y confirma cada cita manualmente.
- Correos: `/admin/correos`. Confirmar o cancelar una reserva conecta las plantillas correspondientes si el servicio está activo y las plantillas publicadas.

`bun run import:template` genera los lienzos desde HTML confiable. Los editores guardan valores tipados, sin aceptar scripts ni HTML arbitrario. Los identificadores generados forman parte del contrato: si se reestructura la plantilla, revisar/migrar los campos antes de importar sobre contenido editado. No ejecutar una reimportación automática en producción.

El repositorio excluye credenciales, respaldos, archivos generados, imágenes originales de trabajo y recursos/scripts públicos del proyecto heredado. El código heredado reutilizable permanece aislado en modo Nident.

Las confirmaciones de eliminación y abandono se muestran dentro del panel, con teclado, foco y cancelación. No se utiliza `alert`, `confirm` ni `beforeunload`. Los cambios editoriales no guardados se recuperan desde `sessionStorage` en la misma pestaña y sesión si su versión del servidor sigue vigente. No se almacenan credenciales SMTP ni JWT en esa copia. Cerrar una pestaña o escribir otra dirección no permite mostrar una confirmación personalizada; guardar y publicar explícitamente sigue siendo el flujo principal.

Las colecciones nacen del contenido de la plantilla y conservan las ediciones previas del lienzo. Publicar una colección vacía oculta su sección en inicio; un catálogo vacío muestra un estado informativo. Los borradores de otras sesiones no se sobrescriben: las operaciones usan versiones y responden 409 ante conflictos.
