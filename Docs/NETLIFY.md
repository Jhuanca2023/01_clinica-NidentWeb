# Desplegar el frontend Nident en Netlify

El repositorio incluye `netlify.toml`: base `Frontend-nident`, comando `bun install --frozen-lockfile && bun run build:netlify`, publicación `dist`, Node 22 y Bun 1.4.3. Se respetan las versiones de `bun.lock`. El comando elige el adaptador oficial Netlify; `bun run build` conserva el adaptador Node para desarrollo, pruebas y contenedores.

## Primera publicación sin Laravel

1. En Netlify, importa el repositorio GitHub `Jhuanca2023/01_clinica-NidentWeb` y selecciona `main`.
2. Conserva la configuración del archivo `netlify.toml`. No selecciones una plantilla SPA ni agregues una redirección general a `index.html`.
3. Para esta demostración, deja **sin configurar** `API_INTERNAL_URL`, `NIDENT_DEMO_MODE` y `REDIS_URL` en Netlify. No copies el `.env` local.
4. Ejecuta el despliegue. Netlify proporciona la URL; el comando la utiliza para enlaces canónicos y sitemap, salvo que definas `PUBLIC_SITE_URL` con tu dominio HTTPS.

Sin una API configurada, `build:netlify` activa explícitamente el modo demostración. El contenido incluido procede de los defaults públicos del repositorio, no de una exportación de MySQL. Se muestran las páginas, sliders, planes y productos con las imágenes de `public/`. Los formularios están desactivados, la API de escritura devuelve 503 y el panel administrativo muestra una explicación en lugar de pedir credenciales. No se registran solicitudes ni se envían correos. La demostración utiliza `noindex`.

Para renovar ese contenido después de cambiar los defaults de la plantilla: `bun run demo:snapshot` y guarda el JSON generado en Git. Esto no copia las ediciones privadas de una base de datos ni imágenes subidas al backend.

## Conectar Laravel después

Despliega Laravel, MySQL, almacenamiento persistente y sus procesos de correo en una infraestructura compatible. El frontend de Netlify no contiene ni ejecuta PHP/MySQL. Antes de producción, resuelve la actualización de Laravel exigida por `nident:doctor`.

Configura en Netlify, para **Builds y Functions**:

| Variable | Valor |
|---|---|
| `API_INTERNAL_URL` | `https://api.TU-DOMINIO/api/v1` (sustituye el ejemplo por tu URL real) |
| `NIDENT_DEMO_MODE` | `false` |
| `PUBLIC_SITE_URL` | URL HTTPS definitiva del frontend |

Vuelve a desplegar. En Laravel, configura las URLs/orígenes de Nident para ese dominio y conserva sus claves existentes. Las sesiones del panel en Netlify usan el almacenamiento proporcionado por su adaptador; el driver de Redis/archivos sigue reservado al despliegue Node. La conexión de API se realiza desde el servidor, sin exponer JWT al navegador.

**Adjuntos:** el flujo actual de hasta tres archivos de 5 MB necesita adaptación antes de operar en Netlify. Sus Functions tienen límites de tamaño inferiores a ese total. Para conservar el límite actual, las subidas deben ir directamente a Laravel o a almacenamiento mediante una autorización segura, en lugar de atravesar la función SSR. La primera publicación en modo demostración no realiza subidas.

## Verificación

`bun run check` y `bun run build:netlify` verifican el tipo y generan los artefactos de Functions. La CI comprueba también el modo de demostración sin backend mediante una compilación Node aislada y vuelve a compilar el destino Netlify. La publicación en una cuenta de Netlify requiere importar/conectar el repositorio; que exista un build local no significa que el sitio esté publicado.

Referencias: [Astro en Netlify](https://docs.astro.build/en/guides/integrations-guide/netlify/) y [límites de Functions](https://docs.netlify.com/build/functions/configuration/).
