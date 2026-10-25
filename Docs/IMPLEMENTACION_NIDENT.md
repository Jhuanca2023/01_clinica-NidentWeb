# Implementación Nident

24 de octubre de 2026. Fundación, CMS, colecciones, productos, dashboard, reservas manuales, contacto, reclamaciones, seguimiento y acceso del personal implementados localmente. Los límites operativos pendientes se describen al final.

## Disponible

- Dashboard con agregaciones reales, series de 7/30/90 días y datos filtrados por permisos. Los estados vacíos no se sustituyen por estadísticas ficticias.
- Colecciones de reseñas y planes: alta, edición, duplicación, orden, visibilidad, eliminación y deshacer. Planes con inclusiones y secciones propias; páginas dinámicas, sitemap, redirecciones y reserva enlazada.
- Confirmaciones accesibles dentro del panel, protección de navegación interna y copia temporal de borradores en la pestaña. Sin diálogos nativos al eliminar o salir.
- Astro SSR: las 28 páginas de la plantilla, redirecciones HTML, recursos Nident, siete banners dinámicos, navegación compartida, sitemap y robots.
- `/admin/login`: cuentas existentes autorizadas, 2FA y sesión de servidor; JWT fuera del navegador y acciones protegidas contra CSRF.
- `/admin/sitio`: índice de páginas, SEO y publicación. Los lienzos por módulo permiten editar textos, enlaces e imágenes, con borrador y publicación; encabezado y footer son compartidos. `/admin/sliders` gestiona cada banner, altas, eliminación y orden. Ver el README raíz.
- `/admin/reservas`: solicitudes reales del formulario `/reservar`, filtros, estados, coordinación manual y correo de confirmación/cancelación condicionado a configuración y publicación de plantillas. Sin reserva automática de cupos.
- `/admin/correos`: seis plantillas, bloques de título/texto/imagen/botón/separador, orden, variables, vista final, borrador, publicación y control de versiones concurrentes.
- Configuración SMTP, remitente, respuesta y destinatario del equipo. Contraseña cifrada y TLS validado.
- Outbox cifrada, cola de BD, reintentos, simulación sin red ni log de contenido y seguimiento de entregas.
- Contacto real con consentimiento e idempotencia. `/admin/mensajes` permite revisar y marcar como leído; no muestra mensajes heredados sin identificador Nident.
- Permisos independientes de sitio, correo y atención mediante las tablas existentes. El principal activo conserva acceso.
- Rutas y tareas heredadas desactivadas en modo Nident; sus módulos y datos se conservan.

## Acceso local

Web: `http://localhost:4321/`. Panel: `http://localhost:4321/admin/login`. API: `http://127.0.0.1:8000/api/v1`.

Utilizar una cuenta autorizada existente en `nident`. No se crearon cuentas ni se cambiaron contraseñas del usuario. Una instalación vacía queda sin usuarios y requiere aprovisionar expresamente su administrador; nunca se instala una contraseña demo.

Backend:

```powershell
php artisan nident:doctor
php artisan nident:install
php artisan serve --host=127.0.0.1 --port=8000
```

Frontend:

```powershell
bun install --frozen-lockfile
bun run dev --background --host 127.0.0.1 --port 4321
```

Gestionar Astro con `bun run dev status`, `bun run dev logs` y `bun run dev stop`. Los archivos de sesión se permiten en desarrollo; producción exige Redis por defecto. El permiso excepcional de archivos está desactivado en el ejemplo de entorno y solo se habilita dentro de la fixture visual aislada.

## Base y migraciones

Se verificó `DB_DATABASE=nident`, con 140 tablas iniciales. Se conservaron conexión, credenciales, APP_KEY y JWT_SECRET. Se activaron NIDENT_MODE y la cola de BD, se desactivó el scheduler heredado y se limpiaron remitentes únicamente cuando correspondían a marcas anteriores.

`nident:install` comprueba el nombre real de la base y ejecuta solo `database/migrations/nident` y `NidentSeeder`. No usar `php artisan migrate` sin ruta durante la transición: el historial de otros clientes todavía está en el directorio original.

| Migración | Efecto |
|---|---|
| `000000_create_nident_security_baseline` | Estructura de seguridad solo cuando falta, sin importar registros |
| `000001_create_nident_cms_and_mail` | Configuración, páginas, plantillas, revisiones, outbox y jobs |
| `000002_use_private_mail_simulation` | Simulación en memoria, sin destinatarios/cuerpos en logs |
| `000003_connect_nident_contact` | Reutiliza mensajes y añade idempotencia y lectura |
| `000004_normalize_initial_mail_footer` | Normaliza el salto de línea del pie inicial, sin cambiar plantillas publicadas o personalizadas |

Los rollback no eliminan implícitamente usuarios, jobs ni mensajes compartidos. La retirada de estructuras nuevas requiere respaldo y un plan explícito.

## Operar correos

1. Abrir Correos y plantillas → Configuración de envío.
2. Definir los correos oficiales de remitente, respuesta y atención. No se inventaron buzones.
3. Elegir Simulación para probar sin red, o SMTP con su host, puerto, TLS, usuario y contraseña.
4. Editar, guardar y publicar la plantilla; activar el servicio.
5. Solicitar una prueba desde el editor a un destinatario elegido explícitamente.
6. Procesar la outbox y los jobs; revisar Entregas recientes.

```powershell
php artisan nident:mail-dispatch
php artisan queue:work database --stop-when-empty --tries=3 --timeout=45
```

Para operación continua se necesitan scheduler y worker supervisados. `appointment_requested` acusa la solicitud pendiente; `appointment_confirmed` y `appointment_cancelled` notifican cambios de estado. `contact_received` acusa al remitente y `contact_notification` avisa al equipo sin incluir el cuerpo. `claim_received` conserva detalle y pedido del consumidor; `claim_updated` comunica la respuesta. `order_received` todavía requiere un módulo de pedidos.

Para desarrollo, `php artisan nident:mailtrap --publish-defaults` lee credenciales SMTP existentes del entorno, guarda la contraseña cifrada y publica solo plantillas iniciales sin editar. Se rechaza en producción. Nunca subir `.env`. Mailtrap Sandbox captura mensajes y no los entrega a buzones reales. El panel muestra servicio, flujos publicados, cola, fallos y entregas. Se comprobaron cuatro envíos sintéticos aceptados por Mailtrap; esto no acredita entrega a clientes reales. Antes de iniciar un worker en una base reutilizada, revisar la cola existente y autorizar su procesamiento.

El Libro de Reclamaciones ofrece constancia imprimible, referencia, identidad del consumidor y representante, detalle/pedido, hasta tres adjuntos privados de 5 MB, atención versionada y respuesta. Completar razón social, RUC y domicilio en `/admin/reclamaciones`; los datos legales iniciales están vacíos para evitar inventarlos. El seguimiento público exige referencia más correo y devuelve solo estado, fechas y estado de notificación.

El administrador principal gestiona usuarios, perfiles y roles. Los roles otorgan permisos por módulo a través de perfiles; las cuentas nuevas no son administradores principales. Cambiar o desactivar una cuenta invalida sus tokens anteriores mediante `nident_auth_version`. Las contraseñas no se devuelven ni se guardan en borradores del navegador. La auditoría conserva actor, acción e identificador, sin contraseñas ni contenido de mensajes.

Al entregar este bloque se iniciaron API, Astro, worker y scheduler locales. Antes se verificó que la cola y la outbox estaban vacías y que el envío seguía desactivado. Estos procesos de desarrollo no sustituyen la supervisión de servicios del despliegue.

`simulated` no representa un envío; `sent` significa aceptación por el transporte, no recepción en la bandeja. El dominio requiere verificar SPF, DKIM y DMARC con su proveedor. No se crearon buzones ni se modificó DNS y no se enviaron correos reales.

El registro de una solicitud es idempotente. SMTP puede repetir una entrega si el proceso se interrumpe tras la aceptación y antes de confirmar su estado; no se promete exactamente una entrega externa sin soporte del proveedor.

## Infraestructura y CI

Se añadieron Dockerfiles, `compose.yaml`, proxy y workflow. Son preparación de staging; no se ha publicado el sitio ni validado la construcción de contenedores en este equipo.

- MySQL 8.4 en contenedores; verificaciones locales en MySQL 8.0.45.
- Redis privado para sesiones, configurado en tiempo de ejecución. Sin credenciales Redis en el build.
- API, worker y scheduler comparten imagen Laravel. Cola de BD para mantener outbox y jobs dentro de la misma transacción.
- API administrativa en listener interno 8081, no publicado al host. Las acciones pasan por Astro y vuelven a comprobar permisos en Laravel.
- HTTP de staging solo en `127.0.0.1:8080`; producción requiere TLS y un proxy de confianza.
- Definir NIDENT_DB_PASSWORD y NIDENT_DB_ROOT_PASSWORD para una base de contenedores independiente de la conexión MySQL local.
- Ejecutar el instalador como paso único, con respaldo verificado, antes de habilitar tráfico. Fijar imágenes por digest antes de promover artefactos.

Laravel sigue en 10.50.3. `nident:doctor` impide operar esa rama con APP_ENV=production; antes debe actualizarse a una rama con soporte y ejecutar las regresiones. No se realizó una actualización mayor incidental.

El workflow prepara una base aislada y comprueba frontend/backend. Su resultado remoto debe revisarse en GitHub después de cada subida.

Git se inicializó para el remoto `https://github.com/Jhuanca2023/01_clinica-NidentWeb.git`, sin alterar ACL ni configuración global. `.gitignore` excluye los recursos, utilidades públicas y credenciales de prueba del proyecto anterior, además de secretos y respaldos.

## Respaldos

Antes de modificar la base se guardó un snapshot cifrado de 140 tablas y 64 rutinas en `backups/`, excluido de Git. Se verificó su descifrado; no se ha ensayado todavía una restauración completa. La APP_KEY actual permite descifrarlo: custodiarla de forma segura y separada, sin regenerarla sobre datos cifrados existentes.

El script es una protección local previa a cambios. Antes de producción faltan copias fuera del host, retención, recuperación puntual, restauración de medios y ensayo documentado.

## Verificación

- 31 tests PHPUnit y 293 assertions: permisos, personal y revocación, productos, seguimiento, flujo de reclamaciones, apertura idempotente, resultados y comentarios internos, versiones, cifrado, outbox, identidad del correo, MIME con imágenes inline sin red y filtros/paginación del backend.
- Pruebas funcionales en `nident_testing`, sin copiar usuarios ni pedidos.
- Instalación en base vacía y repetición: 28 páginas, ocho plantillas, tres colecciones, seis reseñas, seis planes, seis productos y cero usuarios.
- `astro check` y compilación SSR; revisión visual de inicio/editor en escritorio y móvil sin overflow ni errores JS.
- Las páginas públicas responden correctamente; los seis enlaces antiguos de packs redirigen a sus páginas de plan y los HTML antiguos conservan sus redirecciones. La API administrativa anónima devuelve 401 incluso sin solicitar JSON.
- Guardar/publicar desde el navegador usa una API sintética en memoria. La persistencia real se comprueba con PHPUnit; no equivale a iniciar sesión con la cuenta del usuario.
- El navegador integrado no arrancó por el aislamiento Windows; se utilizó Playwright con Edge.
- Fuentes existentes conservadas por identidad, aunque el detector las señale como frecuentes.

## Pendientes del proyecto completo

Disponibilidad automática por profesional/consultorio, bloqueos y concurrencia de cupos; catálogo clínico operativo (tratamientos y sedes ya se editan en lienzos); biblioteca avanzada de medios y restauración de revisiones; pedidos, pagos y conciliación (el catálogo de productos y su consulta ya funcionan); textos legales definitivos; actualización de Laravel y despliegue/restauración ensayados. Los formularios operativos conservan campos estructurados propios.

No se borraron migraciones o imágenes heredadas: se aislaron sus rutas para retirar recursos solo después de demostrar sus dependencias.

Referencias: [sesiones Astro](https://docs.astro.build/en/guides/sessions/), [colas Laravel](https://laravel.com/docs/10.x/queues), [FastCGI Nginx](https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html).
