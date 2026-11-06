# ADR: tribales originales en 3D

**Decisión:** la web muestra dos tribales originales de MANGATA, Cruz y Reflejo, como piezas metálicas en 3D con Three.js y React Three Fiber, sobre puntos que se mueven como agua bajo la luna. Ramiro pidió este cambio el 06/11/2026.

- La librería se descarga solo cuando la sección está por aparecer. No se dibuja nada con la sección fuera de pantalla o la pestaña oculta.
- Sin WebGL, con movimiento reducido, con ahorro de datos o si falla la carga, quedan los dibujos fijos.

## Por qué

- **Sin física:** Ramiro probó una escena con Matter.js y dijo que se sentía rara. En las homes de marcas de moda que se pudieron inspeccionar el 06/11/2026 no apareció Matter.js. Eso muestra su código, no el efecto en ventas. Matter.js salió de las dependencias.
- **Sin las siluetas de la Bermuda Tribal:** eran trazos de apliques reales, pero a Ramiro no le cerraron. Quedan en el historial, en el commit 629f1e2.
- **Sin calcar:** Ramiro pidió basarlos en referencias de Pinterest. Se usaron solo rasgos generales de estilo: simetría, puntas afiladas y contraste de grosores. Pinterest no otorga derechos sobre lo que muestra.

## Origen

`scripts/draw-tribals.mjs` los dibuja desde cero con trazos afilados. Reflejo sale del significado de "mangata", la luna reflejada en el agua. Cruz toma como inspiración la cruz bordada de la Campera Rituales. La hoja completa incluía 7 candidatos; Ramiro aprobó aplicar estos dos.

potrace tiene licencia GPL. Se usa como herramienta externa, fuera de las dependencias del proyecto.

## Límites

- No enlazan a productos, porque ninguna prenda los lleva.
- No se compararon legalmente contra otros diseños existentes.

## Pendiente

- Aprobación de Emilia antes de publicar.
- Administrarlos desde el panel.
