# Nident — maqueta odontológica

Sitio estático con inicio, tratamientos, equipo, tienda y reservas.

Para verlo, sirve esta carpeta con un servidor HTTP. Por ejemplo: `python -m http.server 4173 --directory site` desde la raíz del proyecto.

- El carrusel presenta cinco imágenes cada dos segundos. Se pausa al pasar el cursor, al recibir foco, al ocultar la pestaña o con el control de pausa. Respeta movimiento reducido.
- El acordeón cambia la imagen mediante una transición de entrada y salida.
- La tienda permite buscar, filtrar, agregar, quitar y cambiar cantidades. La bolsa se guarda localmente; no hay pago ni pedido real.
- Las reservas tienen cuatro pasos, una ubicación en Trujillo Centro, acompañante para menores, fecha y horarios simulados. No se envían ni guardan datos del paciente; la agenda local conserva horarios y profesionales de ejemplo para probar bloqueos.
- El video tiene enlace alternativo a YouTube si el proveedor no permite reproducirlo incrustado.
- Las cuentas sociales reales, sedes, equipo, contacto y precios deben sustituir los datos de demostración.
- Fuentes y permisos de fotografía: `assets/img/documentacion/SOURCES.md`.

Validado: navegación y recursos locales, sintaxis JavaScript, escritorio y móvil (390 px), filtros de catálogo, bolsa y reserva infantil completa.

Ampliación de contenido:

- Ocho páginas de tratamientos con opciones, proceso, cuidados, preguntas frecuentes y fuentes clínicas. Las tarjetas abren información antes de la reserva.
- Planes y promociones de demostración, guía de cuidados, comunidad social y espacios de la clínica.
- Carrusel manual de cuatro testimonios ilustrativos, claramente identificados.
- Regreso arriba con anillo de progreso y desplazamiento suave. Transiciones de salida, carga y entrada entre páginas; se omiten con movimiento reducido.
- Fotografías de las referencias descargadas y optimizadas en WebP.

Última ampliación:

- Los planes están inmediatamente después del banner, con portadas fotográficas grandes.
- Cada tratamiento incluye un artículo propio, sin enlaces clínicos de salida.
- Libro de Reclamaciones de demostración: tres pasos, validación, resumen, constancia descargable y consulta por código o documento en la misma sesión. No existe recepción real, envío de correo ni conservación central. Solo se guarda temporalmente código, tipo, fecha y huella SHA-256 del documento.
- Privacidad, términos y cookies describen el comportamiento real de la maqueta y se enlazan desde todos los footers. Deben completarse los datos legales y la operación antes de producción.
- Consentimiento funcional: YouTube no recibe una solicitud del reproductor hasta permitir contenido externo. Retirar el permiso elimina el iframe activo. No se instalaron analítica ni publicidad.
- Verificado: formulario completo con datos ficticios, campos obligatorios, consulta por código, documento y combinación incorrecta; navegación local y anclas.

14-10-2026: seis páginas individuales de packs, contacto independiente, Trujillo Centro y nuevos retratos e imágenes. Carrusel de seis reseñas ilustrativas con estrellas amarillas. Agenda local con retención de 5 minutos, comprobación atómica entre pestañas mediante Web Locks, confirmación y cancelación. No coordina dispositivos distintos; diseño de servidor y restricciones PostgreSQL en Backend-nident/RESERVAS.md. No se guardan nombres, teléfonos ni correos de reservas.

Validación del 14-10: una retención se bloqueó en la segunda pestaña; confirmar mantuvo el bloqueo; cancelar liberó el horario. Dos selecciones en paralelo dejaron una sola retención activa. Contacto validado con datos ficticios. 28 páginas sin recursos ni anclas locales faltantes.

17-10-2026: GSAP 3.13 y ScrollTrigger alojados localmente; entrada fotográfica, revelado por recorte, panel de especialidades con transición al cambiar, pequeño paralaje editorial de escritorio y capítulos de lectura que cambian su fotografía. Sin desplazamiento forzado ni efectos sobre campos de formulario. El footer permite pausar el movimiento y se respeta prefers-reduced-motion.

Se revisaron imágenes y textos de las ocho especialidades. La página de ortodoncia muestra únicamente aparatos y atención de ortodoncia, con fotografías distintas para metálicos, cerámicos y alineadores. Los enlaces a otras especialidades son textuales. Se retiraron fotografías repetidas y párrafos de apertura idénticos.

Validación de movimiento: cambio de especialidad y enlace correspondiente, navegación por teclado y pausa global del movimiento con pausa del banner. Diseño revisado en escritorio y en marcos de 390 px (375 px útiles con scrollbar), sin desbordamiento horizontal.
