# Nident

Web y administración en Astro SSR; API y reglas en Laravel; persistencia MySQL.

Para publicar solo el frontend en Netlify, importa este repositorio: `netlify.toml` configura el adaptador y la compilación. Sin `API_INTERNAL_URL`, se activa una demostración con contenido e imágenes incluidos, formularios desactivados y panel no disponible. Consulta [los pasos y variables de Netlify](Docs/NETLIFY.md) antes de conectar una API real.

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
- Productos: `/admin/productos`. Crear, duplicar, ordenar, ocultar y eliminar; imágenes, precio, categoría, SKU, stock opcional y descripción independiente. Guardar borrador y publicar actualiza `/tienda`, `/api/productos` y `/productos/{slug}`. La selección conduce a una consulta; no registra pagos ni pedidos.
- Personal: `/admin/usuarios`, `/admin/perfiles` y `/admin/roles`, exclusivos del administrador principal. Crear cuentas, asignar perfiles, definir permisos por módulo, exigir 2FA por rol y desactivar accesos. Cada usuario puede cambiar su contraseña en `/admin/mi-cuenta`.
- Reclamaciones: `/libro-reclamaciones` registra solicitudes idempotentes y permite imprimir constancia; `/admin/reclamaciones` filtra, revisa adjuntos privados y registra respuestas. El administrador configura razón social, RUC y domicilio del proveedor en ese módulo.
- Seguimiento: `/consultar-solicitud`, con referencia y correo registrado, muestra el estado de reservas, contacto y reclamaciones sin publicar datos personales ni requerir una cuenta pública.
- Correos: `/admin/correos`. Ocho plantillas editables por bloques; solicitud, confirmación y cancelación de reserva, acuse y aviso de contacto, constancia y respuesta de reclamación conectados. `order_received` queda disponible para un futuro módulo de pedidos. El servicio debe estar activo y la plantilla publicada. Entregas y estado del transporte distinguen Mailtrap Sandbox, simulación y SMTP.

`bun run import:template` genera los lienzos desde HTML confiable. Los editores guardan valores tipados, sin aceptar scripts ni HTML arbitrario. Los identificadores generados forman parte del contrato: si se reestructura la plantilla, revisar/migrar los campos antes de importar sobre contenido editado. No ejecutar una reimportación automática en producción.

En Correos → **Logo, banner y footer** se configura la identidad compartida, los datos de atención y hasta seis enlaces HTTPS. Las imágenes locales se incorporan al correo como adjuntos inline; no necesitan un dominio público. Los enlaces y las imágenes externas sí deben usar una dirección pública HTTPS. La identidad tiene su propio control de versión y no cambia las credenciales SMTP ni los mensajes que ya estaban en outbox.

Reservas y mensajes consultan Laravel con filtros y paginación de 20, 50 o 100 registros. Reservas busca por nombre, referencia, correo o teléfono; mensajes añade estado leído/por revisar, asunto y rango de fechas. El navegador recibe solo la página solicitada y conserva los filtros al navegar o marcar como leído.

El Libro de Reclamaciones utiliza tres pasos de registro (datos personales, domicilio y solicitud) y tres etapas de atención (registrado, en revisión y resultado). El listado administrativo ofrece filtros por tipo, estado y resultado, búsqueda y paginación en Laravel. Entrar a una ficha inicia la revisión mediante un POST protegido e idempotente; leer el endpoint GET no cambia el estado. La ficha permite guardar responsable, comentarios internos y resultado Resuelto/Rechazado, con control de versiones e historial. El consumidor consulta con su referencia NID y correo; la pantalla actualiza el estado cada 30 segundos mientras esté visible y muestra la respuesta final. Los comentarios de revisión permanecen internos. El número REC es de presentación; la referencia NID existente sigue funcionando.

El repositorio excluye credenciales, respaldos, archivos generados, imágenes originales de trabajo y recursos/scripts públicos del proyecto heredado. El código heredado reutilizable permanece aislado en modo Nident.

Las confirmaciones de eliminación y abandono se muestran dentro del panel, con teclado, foco y cancelación. No se utiliza `alert`, `confirm` ni `beforeunload`. Los cambios editoriales no guardados se recuperan desde `sessionStorage` en la misma pestaña y sesión si su versión del servidor sigue vigente. No se almacenan credenciales SMTP ni JWT en esa copia. Cerrar una pestaña o escribir otra dirección no permite mostrar una confirmación personalizada; guardar y publicar explícitamente sigue siendo el flujo principal.

Las colecciones nacen del contenido de la plantilla y conservan las ediciones previas del lienzo. Publicar una colección vacía oculta su sección en inicio; un catálogo vacío muestra un estado informativo. Los borradores de otras sesiones no se sobrescriben: las operaciones usan versiones y responden 409 ante conflictos.
