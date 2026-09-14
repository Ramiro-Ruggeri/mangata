# MANGATA · Verificación del rediseño

Revisión local del 14 de septiembre de 2026 sobre `next build` + `next start`, no sólo el servidor de desarrollo. No se publicaron cambios ni se crearon cobros, pedidos o mensajes externos.

## Dirección implementada

Portada negra con una fotografía real de Baggy Foil y acceso inmediato a la colección. Catálogo sobre papel cálido con selección inicial variada, precio principal y transferencia visibles. Violeta reservado al acento y al foco. La composición conceptual de denim y metal queda después del catálogo y está identificada como imagen de campaña; no se presenta como evidencia de un producto o fotografía del taller.

La nueva home está separada en `Storefront.tsx` y `storefront.css`; la ficha utiliza `PDPClient.tsx` y `product.css`. Se mantienen Next App Router, React, TypeScript, React Compiler, Tailwind, Framer Motion, Lucide, next/image y next/font.

## Comprobaciones ejecutadas

| Superficie | Verificación | Resultado |
| --- | --- | --- |
| Home y ficha | Anchos 360, 390, 430, 768, 1024, 1280 y 1440 px | Sin scroll horizontal; catálogo de dos, tres o cuatro columnas |
| Compra móvil | Barra fija en ficha | Botón de 52 px; producto/precio visibles; se oculta al abrir bolsa o zoom |
| Búsqueda | `FOIL`, consulta inexistente, Escape | Dos resultados reales, estado vacío accionable y foco de regreso al buscador |
| Menú móvil | Apertura, Tab, Escape, navegación a ayuda | Fondo modal aislado y enlaces funcionales |
| Catálogo | Accesorios + menor precio | Cinco resultados ordenados correctamente |
| Fotografías | Carga de producto y campaña | Sin imágenes rotas en las superficies recorridas |
| Galería | Baggy Foil, cambio de vista, ampliación y flechas del teclado | Se muestran las dos imágenes reales, sin duplicar vistas |
| Ficha con una foto | Producto MNGT-001 | No aparecen miniaturas ni flechas innecesarias |
| Bolsa | Agregar/quitar MNGT-003, subtotal, Shift+Tab y Escape | Alta/baja correctas, foco contenido y devolución al botón fijo después de la salida |
| Compra sin backend | Bolsa local | Consulta por WhatsApp con nombres y SKU; no promete un pago online habilitado |
| Confirmación | `/checkout/success?payment_id=12345` sin sesión válida | Pago sin confirmar; no vacía la bolsa; `noindex, nofollow`, sin canonical heredado |
| No encontrado | `/producto/no-existe` | Pantalla de marca y regreso a colección |
| Ayuda | Acordeón de medidas en móvil | Expande contenido sin superposiciones |
| Consola | Recorrido observado en navegador integrado | Sin advertencias ni errores capturados |

La pieza añadida a la bolsa durante las pruebas se quitó, conservando la selección que existía antes de esta revisión. No se envió el mensaje de WhatsApp.

## Comprobaciones automatizadas

- `npm run lint`: aprobado.
- `npm run typecheck`: aprobado.
- `npm run build`: aprobado.
- `npm test`: diez pruebas aprobadas. Incluyen precio manipulado, duplicados, cantidad distinta de uno, fallback, sesión firmada, confirmación ajena, firma/replay de webhook, persistencia, mutaciones serializadas y disponibilidad del checkout.
- `npm run images:optimize`: reconoce los 39 originales de `source-assets/products` y sus derivados existentes; 429,1 MB de originales y 21,5 MB de WebP. No se eliminaron ni alteraron las prendas originales.

## Límites y siguiente validación

Esto no es una certificación WCAG ni una medición de Lighthouse/Core Web Vitals. Se revisaron foco, semántica, tamaño de CTA, modales y estilos de movimiento reducido; queda una prueba con lector de pantalla, sistema operativo en reduced motion y dispositivos físicos iOS/Android. No se atribuye aumento de conversión sin datos comparables.

No se probaron pagos reales ni un backend EverShop real. El cliente del servicio durable y el adaptador EverShop están implementados, pero requieren instancia, configuración, contrato de handoff, persistencia, políticas comerciales y ensayo end-to-end. Cambiar la configuración del backend exige reconstruir y desplegar el storefront con esas variables. Ver `COMMERCE-READINESS.md`.

La ficha no inventa medidas, composición ni cuidados: usa los datos existentes y una consulta contextual. El material auténtico pendiente y los experimentos propuestos están en `CONTENT-HANDOFF.md`. Confirmar con Emilia los datos de MNGT-024 y las condiciones de entrega antes de destacarlo o publicar compromisos comerciales.
