# Release verificado — 21/09/2026

Aplicación publicada en https://mangata.com.ar desde el VPS Hostinger.

- Commit de aplicación: `99e9f7e629b324c2425b6e22775e2d85b40d6e2c`, enviado a `origin/main`.
- Imagen: `mangata/web:99e9f7e629b324c2425b6e22775e2d85b40d6e2c`.
- Release activo: `/opt/mangata/releases/99e9f7e629b324c2425b6e22775e2d85b40d6e2c`, enlazado desde `/opt/mangata/current`.
- Rollback conservado: imagen y directorio de `880610df48e3a42e8994120fe93659c7500a4d05`. No requiere restaurar una base de datos.
- Archivo enviado validado por SHA-256: `a5ca6a2be4dfc17b072ccc1bde0dec258dfa730d41cb8c9964a6b68b1e21c57b`.

## Comprobaciones

- Build local y Docker productivo correctos; TypeScript y ESLint sin errores.
- 40 tests de lógica pasan; `npm audit --omit=dev` sin vulnerabilidades reportadas en el momento de revisión.
- 11 resultados de test PostgreSQL pasan: reserva concurrente de la misma pieza (un ganador), compradores distintos, rollback de múltiples artículos, precio adulterado, reintentos, pagos duplicados, expiración y estados persistentes. Base y red de QA separadas, sin acceso a producción; eliminadas al finalizar. Los pagos del test son datos sintéticos, no cobros a Mercado Pago.
- Chromium y WebKit locales: 13 viewports, 320–2560 px, sin desbordamiento horizontal. Hero y footer de 557 px a 1440 y 2560; contenido máximo de 1320 px. Back conserva categoría, orden y posición. Scroll arriba/regreso, teclado, FAQ, física, pausa, reduced motion, touch, zoom, recuperación de imagen y bolsa simulada pasan.
- Candidato aislado saludable; comparación de ID, SKU, nombre, precio e imágenes de los 26 productos contra la aplicación anterior, sin diferencias. El inventario no se restableció.
- Contenedor final saludable. Secretos runtime sin cambios (comprobación de igualdad), volumen de caché y base comercial conservados. No se reiniciaron otros servicios desde esta tarea.
- Dominio HTTPS 200 y canonical correcto; HTTP y www redirigen por 301 a HTTPS raíz. HSTS, CSP, nosniff y políticas existentes conservadas.
- Prueba real en el dominio: agregar pieza a la bolsa devuelve 200; quitarla deja la bolsa vacía; Mercado Pago habilitado sólo tras confirmar entrega. Botón no pulsado; cero solicitudes de checkout y cero errores JavaScript en ese smoke.
- Suite de navegador completa repetida en `https://mangata.com.ar`: pasa en Chromium, incluidos scroll, fotos, física, búsqueda, filtros y recuperación. La bolsa de esa suite sigue simulada; el smoke anterior prueba por separado la API real.
- Precarga completada: 272 combinaciones, 34 imágenes, anchos 96/256/360/640, AVIF y WebP. Incluye miniaturas, frentes y dorsos.

## Rendimiento: resultado y límite

En tres visitas frías simuladas con CPU ×4, 1,6 Mbps y 150 ms, LCP fue 6,816 / 6,520 / 6,924 s; CLS 0. La foto de portada pesó 25.533 bytes y terminó alrededor de 1,74–1,81 s; el coste restante incluye trabajo de renderizado en el navegador. La misma condición ya mostraba demoras importantes en la versión anterior. No se declara resuelto el objetivo LCP ni una mejora causal de ventas.

Pruebas exploratorias de sustituir fuentes o diferir secciones no produjeron una mejora clara y no se incorporaron. No son un A/B de clientes; los tiempos de laboratorio dependen de la máquina de prueba y no sustituyen métricas de campo. Falta instrumentación externa aprobada para medir p75 y conversión real.

## Pendientes que no se inventan

Medidas/dimensiones por pieza, política de cambios/devoluciones aprobada e identificador de la cuenta de analítica. Continúan las consultas contextuales mientras la marca aporta estos datos. EverShop e implementación del calendario de Instagram permanecen fuera de este despliegue.

[Detalle funcional, fuentes y criterios de implementación](UX-COMPLETO-2026-09-21.md).
