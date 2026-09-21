# MANGATA — recorrido de compra y módulo interactivo

## Alcance

Continuación autorizada de la primera tanda `880610d`. Se conserva Next.js/React/TypeScript, identidad visual, copy aprobado, catálogo, precios, fotos reales, botones de producto, consentimiento, reglas de entrega y seguridad de pagos. EverShop queda en su fase posterior.

Ponytail full: reutilizar estado, diálogos, fotos y CSS existentes. Una dependencia nueva, `matter-js@0.20.0` (MIT), responde a la referencia física que envió el usuario. No se añade una biblioteca de UI, carruseles, smooth scrolling ni otro motor de animación.

## Cambios verificables

| Problema / pedido | Implementación | Referente aplicado |
|---|---|---|
| Búsqueda anunciaba más resultados que los ocho enlaces mostrados | Todas las coincidencias accesibles, palabras en cualquier orden, acentos, descripción y limpieza con devolución del foco | Nielsen: estado visible, control y recuperación |
| Denim incluía foil/canesú sin material confirmado | Filtro basado en denim/jean/vaquero explícito en datos actuales: siete prendas | Baymard: filtrado comprensible; no inventar atributos |
| No era claro qué filtros seguían activos | Chips removibles de categoría, disponibilidad y orden; restablecer colección; contador contextual | Kathryn Reeves / Baymard: filtros aplicados visibles |
| Foto secundaria dependía del hover | Miniaturas de 44 px en cards con más de una foto, selección con touch y teclado | Baymard: miniaturas reconocibles y alternativas al hover |
| Accesorios preguntaban por calce | Consulta contextual por dimensiones; nombre/SKU conservados en WhatsApp | Iva Olah / Baymard: reducir incertidumbre del producto |
| Entrega se explicaba tarde, dentro de la bolsa | Importe en ARS y envío excluido junto a compra; bloque de pago/entrega en ficha y ayuda; acceso desde footer y señal de pago | Transparencia antes del checkout; condición confirmada por la dueña |
| Una foto fallida no tenía recuperación efectiva | Mensaje y reintento en ficha/zoom; URL nueva para evitar reutilizar un fallo cacheado por WebKit | Nielsen: recuperación de errores |
| Cargar más con teclado dejaba el foco lejos de las nuevas piezas | Foco en la primera tarjeta añadida; devolver foco al quitar filtros | Nielsen / WCAG: control y orden de navegación |
| Scroll bidireccional animado en pantallas largas | Movimiento nativo suave arriba y vuelta al ancla/offset; flecha que rota; se oculta ante overlays; reduced motion instantáneo | Ethan Marcotte, Dan Saffer y WCAG: contexto, feedback y preferencia de movimiento |
| Referencia visual de etiquetas con física | Sección tras manifiesto, seis etiquetas arrastrables o activables por teclado, mezclar y pausar | Capturas suministradas y Matter.js; adaptación propia, no copia de una marca |
| Descriptor del negocio inconsistente | «Diseño de autor y upcycling» en descriptor del hero y metadata; headline aprobado intacto | April Dunford: contexto de mercado; adaptación, no posicionamiento validado con clientes |

El módulo físico se importa al entrar en pantalla, se detiene al salir, al ocultar la pestaña y tras 4,5 segundos. No captura el scroll fuera de sus etiquetas. La preferencia de movimiento reducido evita cargar/iniciar la simulación. La compra no depende del módulo.

## Fuentes

Las personas citadas no participan ni avalan este proyecto. Decisiones y píxeles son nuestra adaptación, no recetas textuales ni garantías de conversión.

- [Referentes completos por disciplina y arquitectura de la primera tanda](REFERENTES-Y-PRIMERA-IMPLEMENTACION-2026-09-21.md).
- [Baymard — filtros aplicados](https://baymard.com/research-articles/how-to-design-applied-filters).
- [Baymard — miniaturas para imágenes adicionales](https://baymard.com/research-articles/always-use-thumbnails-additional-images).
- [Baymard — información secundaria en listings](https://baymard.com/research-articles/secondary-hover-information).
- [Iva Olah / Baymard — Apparel UX](https://baymard.com/research-articles/apparel-5-best-practices).
- [Jakob Nielsen — heurísticas de usabilidad](https://www.nngroup.com/articles/ten-usability-heuristics/).
- [Matter.js: documentación](https://brm.io/matter-js/docs/) y [código/licencia](https://github.com/liabru/matter-js).

## Verificación reproducible

- `npm test`, `npm run lint`, `npm run build`.
- `tests/storefront-browser.mjs`: Chromium/WebKit; 13 viewports de 320 a 2560 px; búsqueda, filtros, back, scroll, fotos, teclado, touch, FAQ, física, reduced motion, error de foto y bolsa con API simulada. Bloquea cualquier intento de checkout.
- `tests/postgres-orders.test.ts`: sólo una base desechable `mangata_test_*`; reservas concurrentes, reintentos, duplicados de pago, importes y liberación segura. Nunca ejecutar contra la base comercial.
- `tests/storefront-performance.mjs`: tres visitas móviles frías, CPU ×4, 1,6 Mbps, latencia 150 ms. Diagnóstico de laboratorio; no son datos p75 de clientes ni una prueba de carga.
- Despliegue: imagen por SHA, candidato aislado, comparación del catálogo, salud y rollback a la versión anterior; conservar volumen de imágenes, base de datos y secretos.

## Límites y datos pendientes

Medidas por pieza, dimensiones de accesorios y política de cambios/devoluciones requieren información aprobada por la marca. Se mantienen consultas contextuales; no se inventan talles, garantías ni condiciones. No hay cuenta de analítica externa proporcionada: los eventos siguen siendo un buffer local con consentimiento, no un dashboard comercial. No se publicaron posts ni se alteró Instagram.

La foto de portada existente pesa aproximadamente 25,5 KB en la variante móvil medida. La demora observada incluye renderizado del navegador: en la línea base hubo 3,3 s de Layout con CPU ×4, mientras la imagen ya había terminado. No se atribuye toda la demora a la descarga ni se declara alcanzado el objetivo de Core Web Vitals sin evidencia de campo. No se cambian fuentes ni arquitectura por una hipótesis no confirmada.

No se ejecutan cobros reales, se inventan mejoras de conversión ni se promete «nunca se cae» o compatibilidad con cualquier dispositivo imaginable. La evidencia de publicación y resultados finales se registra junto al release.
