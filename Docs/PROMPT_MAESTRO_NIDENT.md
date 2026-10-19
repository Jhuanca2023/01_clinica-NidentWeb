# PROMPT MAESTRO NIDENT — v1.0
## Migración integral de plantilla HTML a Astro + Laravel + MySQL

Actúa como arquitecto y desarrollador del proyecto Nident. Trabaja sobre el repositorio real, revisa sus instrucciones y contrasta cada decisión con los archivos existentes. No des por implementada una función porque existe su nombre, un controlador, una tabla o una pantalla de demostración.

El objetivo es convertir la plantilla actual en un sitio web odontológico completo, administrable y conectado al backend. Incluye contenido institucional, tratamientos, profesionales, sedes, packs, tienda dental, reservas, contacto y reclamaciones. La tienda es una parte del sitio; no define toda su arquitectura.

Este documento dirige una implementación futura. Empieza únicamente por la Fase 0 y entrega su diagnóstico antes de modificar la aplicación.

### 1. Contexto y fuentes de verdad

Raíz del proyecto:
`D:\JOSE\PROYECTOS\01_clinica-NidentWeb`

- Plantilla visual: `site/`.
- Frontend de destino: `Frontend-nident/`.
- Backend reutilizable: `Backend-nident/`.
- Persistencia de destino: MySQL.
- Marca pública: Nident.
- Idioma principal: español.
- Moneda comercial: PEN, símbolo S/.
- Zona operativa propuesta para las sedes peruanas: `America/Lima`; verificar configuración existente y almacenar instantes de forma consistente, preferentemente UTC.

Prioridades:
1. Las instrucciones del usuario determinan el alcance y el stack.
2. `site/` determina el diseño, estructura editorial e interacciones que se deben conservar.
3. El código del backend demuestra las capacidades disponibles y sus contratos actuales.
4. Los documentos históricos sirven de referencia; pueden pertenecer a otro cliente o describir propuestas sin implementar.

Si hay discrepancias, documenta archivo, comportamiento e impacto. No copies reglas de Valento por inercia ni conviertas datos demo de la plantilla en información oficial.

### 2. Estado observado que debes volver a comprobar

- `Frontend-nident/` contiene Astro y todavía presenta la bienvenida inicial en `src/pages/index.astro`.
- Su `package.json` declara Astro `^7.3.8`, Node `>=22.12.0` y scripts `dev`, `build` y `preview`. Verifica el lockfile y el entorno antes de ejecutar comandos o cambiar dependencias.
- `Backend-nident/composer.json` declara Laravel `^10.10`, plataforma PHP 8.2 y paquetes de autenticación, CMS, archivos y comercio heredados. No actualices todo el stack como parte incidental de esta migración.
- Hay 243 archivos de migración al preparar este prompt. Su cantidad no demuestra que sean prescindibles.
- Las rutas actuales incluyen referencias a Valento, Rossety y Liam. Existen `App\Support\LiamPageData.php`, controladores web antiguos y rutas administrativas orientadas a una SPA anterior.
- La plantilla documenta reservas, bolsa y reclamaciones simuladas. No equivalen a operaciones centralizadas en Laravel/MySQL.
- `Backend-nident/RESERVAS.md` y su esquema asociado describen una propuesta PostgreSQL. Son antecedentes de diseño, no una API operativa ni la base elegida para Nident. La implementación debe usar MySQL.
- No se ha demostrado la existencia de un módulo completo de citas solo con esta revisión. Audítalo antes de reutilizar o crear.

### 3. Arquitectura obligatoria

**Astro:** interfaz pública y panel administrativo. Usa componentes Astro, TypeScript y JavaScript para la interacción necesaria. No reconstruyas el panel en React ni añadas una SPA React por defecto. El admin es parte obligatoria del proyecto.

**Laravel:** reglas de negocio, API, validación, autenticación, autorización, archivos, persistencia, notificaciones, reservas y operaciones comerciales habilitadas.

**MySQL:** contenido editable, configuración y datos operativos. El frontend no accede directamente a la base ni contiene credenciales.

Antes de implementar, define:
- Qué rutas Astro serán estáticas, prerenderizadas o renderizadas en servidor y qué runtime requiere el despliegue.
- Cómo se distribuyen el dominio público, `/admin`, `/api`, archivos y callbacks. Ninguna ruta puede depender de dos routers que compitan por la misma URL.
- Cómo se publican cambios del CMS. Si usas páginas estáticas, implementa reconstrucción o invalidación; guardar en el admin debe reflejarse según una estrategia verificable.
- Cómo se conserva y adapta la autenticación existente. Audita JWT, sesiones, OAuth y 2FA antes de elegir el flujo. No mezcles mecanismos sin necesidad.
- Cómo el servidor Laravel protege cada endpoint administrativo, además de la navegación del panel.
- Cómo se administran cookies, CSRF, CORS, expiración y cierre de sesión conforme al mecanismo elegido. No expongas tokens en URLs ni secretos en variables públicas de Astro.

No reemplaces reglas probadas del backend por cálculos en el navegador. Si un flujo existente depende de Blade, sesión o endpoints web, crea una adaptación compatible para Astro en vez de suponer que ya es una API desacoplada.

### 4. Alcance real de la plantilla

Lee todos los HTML, CSS y scripts relevantes de `site/`. Inventaría selectores, dependencias, datos embebidos y comportamiento. Conserva orden, imágenes apropiadas, tipografía, colores, espaciado, estados responsive y movimiento accesible.

Mapa inicial de rutas de destino, sujeto a resolver compatibilidad durante la Fase 0:

| Plantilla | Ruta propuesta | Función |
|---|---|---|
| `index.html` | `/` | Inicio completo |
| `servicios.html` | `/tratamientos` | Índice de tratamientos |
| Ocho páginas de especialidades | `/tratamientos/{slug}` | Información y acceso a reserva |
| `nosotros.html` | `/nosotros` | Clínica, equipo y sedes |
| `promociones.html` | `/promociones` | Planes y promociones |
| Seis páginas `pack-*.html` | `/packs/{slug}` | Detalle de cada pack |
| `tienda.html` | `/tienda` | Catálogo y bolsa; conectar operación comercial |
| `cuidados.html` | `/cuidados` | Contenido educativo |
| `contacto.html` | `/reservar` | Flujo de reserva |
| `contactanos.html` | `/contacto` | Contacto general |
| `libro-reclamaciones.html` | `/libro-reclamaciones` | Recepción real |
| `estado-reclamo.html` | `/estado-reclamo` | Consulta protegida de solicitud |
| `privacidad.html` | `/privacidad` | Política de privacidad |
| `terminos.html` | `/terminos` | Términos |
| `cookies.html` | `/cookies` | Política y preferencias |
| `navegacion.html` | `/mapa-del-sitio` | Navegación accesible |

Especialidades actuales: odontología general, ortodoncia, odontopediatría, endodoncia, periodoncia, implantes, limpieza y blanqueamiento, diseño de sonrisa. Los slugs y títulos definitivos salen de los archivos reales.

Importante: en la maqueta `contacto.html` significa reserva y `contactanos.html` significa contacto. No los inviertas accidentalmente. Actualiza enlaces, anclas y parámetros como `?sede=...` de forma consistente; define redirecciones de URLs antiguas solo cuando su destino sea inequívoco.

Para inicio, entrega una matriz por cada sección real: selector, contenido, imágenes, interacción, fuente de datos y editor administrativo. No impongas el home de Valento ni omitas testimonios, preguntas frecuentes, equipo o contenido educativo presentes en Nident.

### 5. Marca, imágenes y datos iniciales

Audita referencias de Valento, Rossety, Liam Vercceli, Verselli y cualquier cliente anterior en:
- Contenido de BD, seeds, valores por defecto y fallbacks.
- Layouts, títulos, favicon, logos, imágenes, manifest y pantalla de acceso.
- API pública, asuntos y cuerpos de correo, remitentes y destinatarios.
- SEO, JSON-LD, Open Graph, sitemap, errores y archivos descargables.
- Panel administrativo, pie de página y notificaciones.

Clasifica cada coincidencia como VISIBLE, CONFIGURACIÓN OPERATIVA, DATO HEREDADO o IDENTIFICADOR INTERNO. No hagas reemplazos masivos que rompan clases, rutas, CSS o relaciones.

Usa los recursos Nident de `site/assets/` tras verificar su ubicación y uso. El logo actual enlazado por la plantilla incluye `assets/img/marca/logo1-trim.webp`; verifica las variantes y genera las derivadas necesarias solo desde recursos adecuados. Revisa favicon y metadatos en web y admin.

No borres directorios completos de imágenes por su procedencia. Primero identifica referencias en código, BD, archivos serializados y contenido. Elabora un manifiesto de conservar, sustituir, archivar o eliminar; elimina únicamente lo que tenga reemplazo o esté demostrado sin uso y dentro del alcance aprobado.

Los correos `.example`, precios ilustrativos, reseñas demo, profesionales, horarios y sedes pendientes no son datos oficiales. No inventes RUC, razón social, dirección, teléfonos, perfiles sociales, credenciales clínicas ni testimonios. Define campos de configuración y una lista de datos pendientes. No envíes mensajes a destinatarios heredados.

Conserva la identificación de contenido ilustrativo hasta contar con datos validados. No retires avisos de simulación antes de que el flujo real funcione; sustitúyelos por mensajes que describan su comportamiento efectivo.

### 6. Reutilización del backend

Para cada módulo, revisa ruta, middleware, controlador, servicio, modelo, tabla, migraciones y comportamiento. Clasifica como EXISTE Y FUNCIONA, PARCIAL, EXISTE PERO NO APLICA o NO EXISTE. Indica evidencia y lo que no pudiste comprobar.

Candidatos que debes auditar:
- Usuarios, perfiles, roles, permisos y `sistema_menu`.
- JWT, recuperación, OAuth y 2FA.
- Header, footer, sliders, banners, WhatsApp y favicon.
- Equipo, planes, testimonios, FAQ, páginas y mensajes de contacto.
- Productos, categorías, ofertas, carrito, pedidos y stock.
- Pasarelas, comprobantes, envíos y notificaciones.
- Reclamaciones, archivos y metadatos.

Reutiliza capacidades transversales sin arrastrar el contenido del cliente anterior. Un módulo genérico de planes puede servir para packs; un catálogo de productos no debe convertirse en agenda solo por ahorrar una tabla.

No supongas que los módulos descartados por Valento también se descartan aquí: equipo, planes, FAQ y testimonios pueden ser necesarios para Nident.

Los módulos ajenos se desactivan en menú y también se revisan sus endpoints, permisos, tareas y exposición pública. Ocultar un enlace no deshabilita una función. Conserva capacidades futuras cuando sea razonable, sin exponerlas ni ejecutarlas innecesariamente.

Las clases y rutas internas heredadas pueden mantenerse temporalmente con una capa de adaptación. Si se renombran, revisa referencias y compatibilidad. No impongas una prohibición permanente de renombrar `LiamPageData` ni mantengas Blade como frontend público de destino.

### 7. Limpieza y consolidación de migraciones

La depuración de migraciones forma parte del proyecto. Hazla según el estado real del entorno y sus dependencias, no borrando archivos para reducir el número.

Antes de cambiar el historial:
1. Determina si existe una BD conectada, qué entorno es y si tiene datos que deben conservarse. No muestres secretos.
2. Contrasta migraciones, tabla `migrations`, esquema efectivo, claves foráneas, índices, seeds y referencias del código.
3. Clasifica archivos: estructura necesaria, ampliación vigente, datos del cliente anterior, rebrand histórico, duplicado, obsoleto o pendiente de aclaración.
4. Presenta un manifiesto con archivo, dependencia, acción y justificación.

**Si la base es nueva, aislada y descartable:** puedes proponer una línea base limpia para Nident, consolidar cambios y retirar migraciones heredadas redundantes. Conserva todas las columnas, índices, relaciones y tablas que utilicen módulos retenidos. Los datos iniciales van en seeders idempotentes de Nident, separados de la estructura. Valida el resultado creando otra base temporal vacía, sin tocar una base compartida.

**Si la base contiene datos o historial compartido:** conserva la cadena aplicada y utiliza migraciones incrementales. Si se necesita compactar, define y verifica una línea base o snapshot compatible con el historial; no elimines archivos aplicados de forma aislada.

Si no puedes determinar el estado, deja la eliminación pendiente y continúa con el trabajo independiente. No ejecutes `migrate:fresh`, `db:wipe`, `DROP` ni truncados contra la base actual sin autorización explícita de su destrucción y respaldo verificado. La intención de limpiar migraciones no autoriza perder datos.

Entregables: esquema final, seeds Nident, plan de transición para bases existentes cuando aplique y comprobación de instalación desde cero. No mezcles datos de prueba con usuarios o contenido de producción.

### 8. Reservas y agenda real

Migra el flujo visual de `site/js/booking.js` hacia una agenda central en Laravel/MySQL. Web Locks, localStorage y sessionStorage pueden ayudar a la experiencia local, pero no son autoridad de disponibilidad.

La agenda debe representar sedes, tratamientos, profesionales, especialidades, consultorios o recursos, horarios, duración, descansos, bloqueos y excepciones. No conviertas todos los tratamientos en citas de una hora por copiar el demo.

Requisitos:
- Consultar disponibilidad; retener temporalmente; confirmar; cancelar y reprogramar.
- Retención con vencimiento controlado por servidor; usa los cinco minutos del demo como valor inicial configurable.
- Validar duración, profesional, sede y recursos en servidor.
- Impedir superposición total y parcial de intervalos de profesional y consultorio, incluso entre dispositivos distintos.
- Diseñar exclusión con transacciones y bloqueos sobre recursos existentes o franjas normalizadas con restricciones únicas. Un `SELECT` de citas seguido de `INSERT` sin exclusión no basta cuando todavía no hay filas.
- Adquirir bloqueos en orden consistente, tratar deadlocks y probar la estrategia con MySQL real. No trasladar restricciones de exclusión de PostgreSQL como si existieran en MySQL.
- Confirmación y reintentos idempotentes, validación de propietario y vencimiento, error de conflicto recuperable.
- Reprogramación atómica: si el nuevo horario falla, se conserva la cita original.
- Agenda administrativa con filtros, estados, bloqueos y auditoría.
- Atención de menores con datos mínimos del representante según el flujo validado.
- Confirmación persistida independiente del éxito del correo; reintentar notificaciones sin duplicar citas.

Define los estados y transiciones según la operación de Nident. Distingue confirmación automática de solicitud pendiente de revisión. El éxito de una interfaz nunca prueba por sí solo que existe una reserva real.

No amplíes el proyecto a historia clínica, odontograma o prescripciones sin requerimiento específico.

### 9. Tienda dental y packs

Conserva la tienda y reutiliza el motor comercial aplicable, tras auditar su estado. No elimines el módulo por tratarse de una clínica.

- Precios, descuentos, envío y totales se calculan en Laravel.
- El frontend no confirma pagos ni descuenta stock.
- Pagos confirmados por proveedor y webhooks autenticados; reintentos idempotentes.
- Pedidos, comprobantes, inventario y notificaciones deben mantener consistencia transaccional.
- No actives pasarelas heredadas, cuentas bancarias o destinatarios anteriores. Configura pruebas antes de habilitar cobros.
- Reutiliza variantes solo si los productos dentales las requieren. Tallas y colores de ropa dejan de ser requisitos obligatorios.
- Añade detalle, carrito, checkout, confirmación o cuenta cuando el flujo operativo lo necesite; no afirmes que esas páginas ya existen en `site/`.

Distingue producto físico, pack de atención y reserva. Un pack informativo no representa automáticamente un producto cobrable ni una cita confirmada. Define precio validado, inclusiones, vigencia, restricciones y mecanismo de reserva o compra antes de activarlo comercialmente.

### 10. CMS y administración obligatoria

Construye el panel con Astro y Laravel, reutilizando endpoints y permisos compatibles. Define una estructura administrativa coherente con el sitio:

- Resumen: actividad, citas, mensajes y alertas reales.
- Sitio web: navegación, inicio, secciones, banners, footer y recursos compartidos.
- Clínica: nosotros, sedes, profesionales y horarios públicos.
- Tratamientos: listado, detalle, contenido, imágenes, FAQ y enlaces a reserva.
- Packs y promociones: inclusiones, restricciones, vigencia y publicación.
- Agenda: disponibilidad, citas, retenciones, bloqueos y excepciones.
- Contenidos: cuidados, testimonios y galerías cuando existan en la plantilla.
- Tienda: productos, categorías, stock, pedidos y configuración comercial aplicable.
- Atención: mensajes y reclamaciones con estados y seguimiento.
- Configuración: marca, contactos, WhatsApp, SEO, legales, cookies, correo e integraciones.
- Seguridad: usuarios, roles, permisos y auditoría.

Los nombres anteriores son una organización propuesta, no prueba de tablas ya existentes. No dupliques módulos para conseguir ese menú.

Todo contenido de negocio que deba gestionar el cliente se edita sin tocar código. Los textos técnicos de interfaz y la estructura de componentes pueden permanecer en código. No intentes guardar cada fragmento de HTML en BD.

El CMS debe permitir crear o editar según el módulo, ordenar, activar, desactivar, subir o sustituir imágenes y previsualizar. Define estados borrador/publicado cuando sean necesarios. Los formularios incluyen validación, carga, error y confirmación de guardado.

Usa campos estructurados y texto enriquecido limitado y sanitizado donde aporte valor. No habilites HTML, scripts o estilos libres. Valida archivos por tipo, tamaño y permisos; separa medios públicos de adjuntos privados.

Para edición visual, reutiliza componentes o una previsualización fiel de la web con datos de borrador. No copies dependencias de React como `CmsPanelRoot`, hooks o MUI, ni impongas el ancho fijo de 330px del prompt anterior.

### 11. Contacto, reclamaciones y datos personales

Conecta contacto y reclamaciones a persistencia real, recepción administrativa y notificaciones configuradas. Una descarga de constancia local no acredita recepción del servidor.

- Genera constancia y código después de guardar la solicitud.
- Define seguimiento, estados, responsables y auditoría.
- Evita consultas que expongan reclamos por enumerar DNI, RUC o códigos predecibles. Usa un mecanismo de acceso verificable y limita intentos y respuesta pública.
- No expongas adjuntos sensibles mediante rutas públicas heredadas sin revisar autorización.
- Recoge solo datos necesarios; controla acceso por función y evita datos personales en logs, URLs, analítica o almacenamiento local innecesario.
- Las preferencias de cookies deben corresponder a las integraciones reales. Mantén el bloqueo de contenido externo hasta contar con el consentimiento correspondiente.
- Los textos legales de la maqueta deben actualizarse a la operación final y a los datos oficiales. No atribuyas validez legal a un texto demo.

### 12. Calidad visual, SEO y rendimiento

La migración debe conservar la identidad actual. Extrae layouts y componentes compartidos en Astro sin rediseñar por conveniencia ni perder interacciones.

Revisa `main.js`, `nident.js`, `content.js`, `experience.js`, `packs.js`, `booking.js`, `hero-motion.js`, `alive.js` y los recursos vendor que realmente se usan. Elimina inicializaciones duplicadas y listeners acumulados; comprueba las transiciones entre páginas si decides conservarlas.

Mantén accesibilidad por teclado, foco visible, formularios etiquetados, contraste, alternativas de imagen, pausa de carruseles y `prefers-reduced-motion`. El contenido debe seguir disponible si una animación falla.

SEO: títulos y descripciones editables, canonical, Open Graph, sitemap XML, robots y datos estructurados basados en información verificada. Excluye admin, borradores y contenido privado. No publiques puntuaciones o reseñas demo como reputación real.

Optimiza imágenes, dimensiones, carga diferida y scripts. Incluye estados vacíos y fallos de API; no sustituyas un error con datos falsos presentados como reales.

### 13. Fases de ejecución

**Fase 0 — Auditoría, sin modificar la aplicación**

Lee las instrucciones del repositorio, la plantilla completa y el backend relevante. Entrega:
1. Estado real de Astro, Laravel, MySQL y del panel previo; verificaciones pendientes.
2. Matriz: página | sección/selector real | funcionalidad | archivo/backend | estado | acción | editor administrativo | cambio de BD.
3. Acciones únicas por elemento: REUTILIZAR, CONECTAR, ADAPTAR, CREAR, DESACTIVAR o RETIRAR.
4. Inventario de módulos y dependencias; evita afirmar que funcionan sin una comprobación.
5. Inventario de marcas, logos, imágenes, favicon y datos demo.
6. Clasificación y propuesta de depuración de migraciones con escenario de conservación de datos.
7. Arquitectura propuesta: rutas, renderizado Astro, publicación CMS, API, autenticación y despliegue.
8. Diseño de agenda compatible con MySQL y estrategia concreta contra solapamientos.
9. Modelo de datos propuesto solo para las carencias demostradas.
10. Lista de datos oficiales faltantes, decisiones pendientes y secuencia de implementación.

Después de entregar la Fase 0, espera su aprobación. No ejecutes migraciones, elimines imágenes ni empieces la implementación durante esta fase. Puedes continuar comprobaciones de lectura necesarias para completar el diagnóstico.

**Fase 1 — Base técnica y limpieza**

Tras aprobar el diagnóstico: configura la integración Astro/Laravel, marca Nident, autenticación administrativa, rutas y recursos; ejecuta únicamente la estrategia de migraciones y limpieza aceptada. Separa cada cambio para poder revisar y revertir. Si una eliminación necesita datos que no se han confirmado, continúa con las tareas independientes.

**Fase 2 — Sitio público y CMS**

Migra por bloques funcionales: compartidos e inicio; nosotros/equipo/sedes; tratamientos; packs/promociones; cuidados; contacto; legales y preferencias. Conecta cada bloque a Laravel y a su editor al mismo tiempo. Una sección no queda terminada si solo existe la pantalla pública o solo su formulario de admin.

**Fase 3 — Agenda y atención**

Implementa reservas centralizadas, agenda administrativa, contacto y reclamaciones con sus pruebas de integridad, acceso y concurrencia.

**Fase 4 — Comercio**

Conecta tienda, bolsa y operaciones comerciales conforme al alcance validado. Implementa páginas faltantes y verifica stock, pedidos y pagos de prueba cuando correspondan.

**Fase 5 — Validación integral y entrega**

Verifica navegación, administración, datos, SEO, accesibilidad, responsive, compilación e instalación de BD. Documenta configuración y despliegue sin secretos.

Una vez aprobada la implementación, avanza dentro de su alcance sin pedir permiso para cada archivo, página o decisión reversible. Solicita aclaración solo cuando una decisión cambie sustancialmente el negocio o implique una operación destructiva no autorizada.

### 14. Criterios de aceptación

Cada resultado se informa como OK, FALLA o BLOQUEADO, con evidencia. No presentes una prueba pendiente como aprobada.

- Todas las páginas de la plantilla están migradas o tienen una decisión explícita y justificada.
- Inicio y páginas internas conservan el diseño en escritorio y móvil; no hay enlaces o recursos rotos.
- Menú, footer, imágenes y favicon muestran Nident; no se filtran marcas o destinatarios anteriores.
- El admin funciona con Astro y Laravel; todos los módulos previstos tienen permisos verificados en servidor.
- Editar, ordenar, publicar y desactivar contenido se refleja en la web mediante la estrategia elegida.
- Las reservas se guardan en MySQL y se gestionan desde el panel.
- Dos solicitudes simultáneas al mismo recurso e intervalo no generan dos reservas; también se prueban solapamientos parciales y recursos compartidos.
- Vencimiento, cancelación, reprogramación y reintentos conservan integridad.
- Contacto y reclamaciones quedan registrados y su consulta no expone información de terceros.
- El catálogo usa datos reales o demo identificados; checkout, pedidos y stock se verifican cuando se habilita venta.
- Los pagos se verifican en entorno de prueba y por servidor. Sin credenciales, informa el bloqueo y prueba el resto del flujo sin simular un pago exitoso real.
- El esquema instala desde cero en una BD aislada y la transición de datos existentes está comprobada cuando corresponda.
- No se han borrado activos, tablas o migraciones necesarios para módulos retenidos.
- Ejecuta `npm run build` en `Frontend-nident` o el comando equivalente del gestor confirmado en el proyecto. No reutilices `pnpm run build:production` si ese script no existe.
- Ejecuta las comprobaciones Laravel y pruebas pertinentes a los cambios. Dinero, permisos, agenda, idempotencia y migraciones requieren validación de comportamiento.
- El entorno de producción no publica admin como contenido indexable, datos demo engañosos ni secretos.

### 15. Forma de trabajar y reportar

Revisa antes de crear; reutiliza antes de duplicar. Mantén separados los hechos comprobados, las propuestas y las dependencias pendientes. No declares trabajo terminado por compilar si falta comprobar su comportamiento.

Al cerrar cada bloque informa brevemente: qué cambió, archivos, endpoints y tablas involucrados, qué se verificó y qué queda pendiente. Actualiza el plan cuando el código real contradiga una suposición de este documento.

Empieza ahora por la Fase 0 de Nident. No ejecutes el prompt histórico de Valento ni heredes sus datos, rutas de frontend, módulos obligatorios de ropa o instrucciones de React/Blade.
