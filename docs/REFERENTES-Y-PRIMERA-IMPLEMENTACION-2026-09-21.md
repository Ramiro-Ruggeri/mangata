# MANGATA — referentes, decisiones y primera implementación

Fecha: 21 de septiembre de 2026. Base de código: `e47441e`.

Esta es la primera tanda autorizada después del informe de posicionamiento. Las referencias por disciplina se amplían **ahora**; no se atribuyen retroactivamente a todo el trabajo anterior. Ninguna de estas personas participa del proyecto ni avala MANGATA. Los patrones se adaptan al catálogo y al contexto argentino, no se copia la estética de una marca completa.

## Referentes y aplicación concreta

| Área | Referente y fuente primaria | Principio que tomo | Decisión para MANGATA y alcance |
|---|---|---|---|
| Posicionamiento | [April Dunford — Quickstart Guide to Positioning](https://www.aprildunford.com/post/a-quickstart-guide-to-positioning) | Estudiar alternativas, atributos, valor, mejores clientes y contexto de mercado. El posicionamiento no se reduce al eslogan. | Conservar el producto y la explicación de diseño/upcycling junto al CTA. Se mantiene el copy aprobado «Diseñado para vos», mejorando su presentación; no se afirma haber validado un nuevo posicionamiento con compradores. El método nace de otros mercados: su aplicación a moda es una adaptación explícita. |
| Ecommerce de indumentaria | [Iva Olah / Baymard — Apparel UX](https://baymard.com/research-articles/apparel-5-best-practices) | Reducir incertidumbre sobre apariencia, medidas y calce. | Fotos completas, nombre y precio legibles; conservar acceso a medidas y fotos reales. Faltan medidas por pieza y fotos con escala/modelo: siguen en backlog, no se inventan. La referencia no demuestra un aumento de ventas en MANGATA. |
| UX y navegación | [Jakob Nielsen — Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | Estado visible, control para salir/volver, consistencia y reconocimiento. | Se conserva el estado de colección por encima de la ruta; se prueba volver desde una ficha con filtro y orden. Búsqueda sin resultados, Escape y retorno de foco por teclado. |
| Dirección de interfaz y consistencia | [Dan Mall — Content & Display Patterns](https://v5.danmall.com/posts/content-display-patterns/) y [Design System Foundations](https://v5.danmall.com/posts/folly-of-design-system-foundations/) | Separar contenido de presentación y partir de patrones útiles existentes. | Evolución de los componentes actuales: una regla de ancho compartida, tipografía acotada y jerarquía de imagen/nombre/precio. Sin crear un design system paralelo ni cambiar la identidad. Los valores concretos de píxeles son decisiones propias verificadas, no recomendaciones textuales de Mall. |
| Responsive | [Ethan Marcotte — Responsive Web Design](https://alistapart.com/article/responsive-web-design/) | Grillas fluidas, imágenes flexibles y ajustes al contexto de pantalla. | Grid/Flex y `minmax`, `max`, `clamp`; contenido máximo de 1320 px, imágenes proporcionales, titulares con límites. Se verifica una matriz real de tamaños, no se promete compatibilidad universal. |
| Microinteracciones | [Dan Saffer — entrevista sobre Microinteractions](https://uxpod.com/episodes/microinteractions-an-interview-with-dan-saffer.html) | Disparador, reglas, feedback y estados de una interacción. | Conservar feedback de bolsa, filtros, FAQ y retorno; hover de foto sólo con mouse/puntero fino. Foco de la foto visible dentro de la tarjeta. Mantener reduced motion y no añadir movimiento continuo, parallax ni delays de navegación. |
| Copy orientado a conversión | [Joanna Wiebe / Copyhackers — Voice of Customer](https://copyhackers.com/a-super-speedy-formula-to-find-voc-fast/) | Investigar lenguaje y problemas reales antes de redactar promesas. | Se respetan los textos suministrados por la marca. Nuevas variantes del informe son hipótesis; falta contrastarlas con consultas y entrevistas reales. No se escriben testimonios ni cifras ficticias. |
| Contenido e Instagram | [Ann Handley — AI Slop, Accusations, and a Better Way](https://annhandley.com/ai-slop/) | Preservar criterio, voz y trabajo original; no resolver la autenticidad cambiando palabras superficialmente. | Criterio editorial para documentar prendas y proceso real con la voz de la marca. Aplicarlo a Instagram es nuestra adaptación, no una fórmula de ranking de Handley. No se publicaron posts ni se cambió la bio; faltan Insights y material de la dueña para validar el plan editorial. |
| SEO ecommerce | [Aleyda Solís — problemas de SEO ecommerce](https://www.aleydasolis.com/en/search-engine-optimization/ecommerce-seo-issues-how-to-fix/) | Enlaces rastreables, páginas con contenido distintivo y tratamiento consistente del inventario. | Preservar URLs, enlaces de producto, canonical y sitemap. No crear categorías indexables vacías ni cambiar slugs en esta pasada visual. La expansión SEO necesita demanda y catálogo suficiente; no se da por implementada. |
| Rendimiento | [Addy Osmani y Katie Hempenius — Speed at Scale](https://web.dev/articles/speed-at-scale) y [web.dev — Image Performance](https://web.dev/learn/performance/image-performance) | Presupuesto de rendimiento, carga diferida y bytes adecuados a la pantalla. | `sizes` coincide con los nuevos límites: hero hasta 520 px CSS, tarjetas hasta 315 px en desktop amplio. Se conserva precarga de hero y lazy loading del catálogo. No se agregan imágenes, fuentes ni dependencias. No se infiere LCP de producción desde el servidor local. |
| Arquitectura | [Martin Fowler — Monolith First](https://martinfowler.com/bliki/MonolithFirst.html) | Evitar el costo de servicios distribuidos sin necesidad; conservar límites internos claros. | Evolución de la aplicación Next.js actual, no migración ni microservicios. Cambios visuales aislados de catálogo, reservas, conciliación y cobros. Fowler presenta experiencia y argumentos, no una garantía de disponibilidad. |
| QA | [Kent C. Dodds — Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) | Comprobar el uso real además de funciones aisladas. | Suite existente más un script de navegador reproducible, sin sumar framework. Se prueban navegación, filtros, FAQ, teclado, responsive y preferencias de movimiento. No se sustituye una compra real por un test visual. |
| Accesibilidad | [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Reflow, contraste, foco perceptible, operación por teclado y alternativas textuales. | Mayor legibilidad, foco visible en fotografía y control de disponibilidad con área de 44 px. El objetivo sigue siendo AA; esta tanda no equivale a una certificación completa. |

### Referencias específicas del rubro

El informe anterior estudió casos como [Rave Review](https://www.rave-rvw.com/product/laila-skirt-unique/), [Marine Serre](https://www.marineserre.com/en/products/upcycled-household-linen-twin-pocket-shirt), [Bode One-of-a-Kind](https://bode.com/collections/womens-one-of-a-kind) y [Patagonia Worn Wear](https://wornwear.patagonia.com/pages/faq). Sirven para estudiar presentación de piezas singulares, identidad editorial y claridad de condición/compra. **Son referencias de producto/diseño, no experimentos de conversión de MANGATA.** No se atribuyen ventas a su estética ni se presentan sus políticas como políticas de esta tienda.

No se aplicó una supuesta metodología de Lauti Cardozo sin documentación verificable. No se importaron componentes de 21st.dev.

## Arquitectura conservada

La implementación sigue usando Next.js 16.3.5 instalado, React 19, TypeScript, Tailwind/CSS, Motion y Lucide existentes. No hay nuevas dependencias de aplicación.

- Presentación: `Storefront.tsx` y `storefront.css`. Los cambios de este lote quedan aquí.
- Estado de navegación: `ExperienceProvider` conserva selección del catálogo y coordina overlays; no se remonta por producto.
- Comercio: `CartProvider` y la capa `lib/commerce` mantienen identidad, disponibilidad y precios del servidor.
- Pagos: `/api/mp`, firma de sesión, reservas PostgreSQL, webhook firmado y conciliación conservados. No hay cambios de esquema, secretos, política de entrega ni pagos.
- Entrega: se cobra la prenda; envío/retiro se coordina aparte, tal como confirmó la dueña.
- Infraestructura existente: VPS Hostinger, proxy HTTPS y dominio oficial. Esta pasada local no modifica DNS, certificados ni contenedores productivos.
- EverShop permanece en una fase posterior. No se añade infraestructura «por si acaso».

Ponytail full se traduce aquí en tres decisiones: corregir escala con CSS nativo, reutilizar el estado/interacciones existentes y no instalar una librería de diseño, animación o pruebas.

## Cambios realizados

- Hero de dos líneas en lugar de tres, sin cambiar sus palabras. Imagen completa y CTA conservados.
- Ancho máximo compartido de 1320 px: header, hero, colección, información de compra, manifiesto, ayuda y footer dejan de expandirse indefinidamente.
- Footer sin wordmark proporcional ilimitado al viewport. Se conservan colección, contacto, Instagram, email y acceso a privacidad/preferencias.
- Textos principales del hero: 16 px desktop y 14 px móvil. Descripciones, preguntas y respuestas más legibles.
- Cards: nombres/precios más legibles y tamaño de imágenes solicitado acorde al ancho real. No se modificaron los botones de sumar ni de detalle; tampoco la ficha de producto.
- Hover de portada sólo para puntero fino. Foco de la fotografía dibujado hacia dentro para no quedar recortado por su contenedor.
- No hay nuevas promesas, promociones, descuentos, fotos sintéticas ni cifras de ventas.

## Evidencia de escala

Altura de cada sección, en píxeles CSS. Antes: auditoría de la versión `e47441e`. Después: build local. El footer medido no incluye el bloque separado de privacidad.

| Viewport | Hero antes → después | Footer antes → después | Tarjeta antes → después |
|---|---:|---:|---:|
| 390 × 844 | 423 → 441 | 813 → 733 | 169 → 169 |
| 1440 × 900 | 677 → 557 | 806 → 557 | 315 → 315 |
| 1920 × 1080 | 772 → 557 | 893 → 557 | 419 → 315 |
| 2560 × 1440 | 772 → 557 | 1000 → 557 | 579 → 315 |

El hero móvil aumenta 18 px porque se prioriza texto legible, no comprimirlo a cualquier costo. En pantallas horizontales de poca altura sigue siendo necesario hacer scroll; no se oculta contenido para forzarlo dentro del primer viewport.

## QA y ejecución

- 38 pruebas existentes aprobadas; lint, TypeScript y build de producción local aprobados.
- Chromium y WebKit: 320, 360, 390, 430, 700, 720, 768, 844, 1024, 1280, 1440, 1920 y 2560 px. Cero overflow horizontal en las vistas normales comprobadas.
- El viewport 720 × 450 comprueba el reflow equivalente a 1440 × 900 con zoom 200%; no es una prueba del control nativo de zoom ni de Safari en un iPhone físico.
- Filtros, orden y offset de la misma tarjeta conservados al volver desde producto (tolerancia de 4 px); carga de 8 a 16 piezas; búsqueda vacía; Escape devuelve foco al disparador de teclado; FAQ por click/Space; hover efectivo y reduced motion.
- Bolsa por touch: agregado/eliminación y estado vacío comprobados con respuesta de API simulada desde el catálogo real. No es un test end-to-end de comercio: el origen del build local no estaba configurado para aceptar el POST y devolvió 403. No se relajó esa protección; queda por repetir el smoke real bajo el origen autorizado al publicar. Los tests de validación/API existentes pasan por separado.
- Sin errores JavaScript capturados ni solicitudes al checkout durante la suite.
- El script `tests/storefront-browser.mjs` usa Playwright ya disponible en la estación, sin añadirlo al bundle de la tienda. `QA_BASE_URL` selecciona la URL; `QA_BROWSER=webkit` cambia motor; `QA_SCREENSHOTS` guarda capturas opcionales. `NODE_PATH` puede señalar una instalación existente de Playwright.

```powershell
$env:NODE_PATH='C:\Users\L A T I T U D E\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:QA_BASE_URL='http://127.0.0.1:3001'
node tests/storefront-browser.mjs
$env:QA_BROWSER='webkit'
node tests/storefront-browser.mjs
```

Límites: no se ejecutó un cobro, prueba de carga, auditoría exhaustiva WCAG ni medición de campo p75. No se afirma «nunca se cae», «100% de pantallas» ni un incremento medido de ventas. Faltan datos comerciales y de audiencia para cuantificar conversión. Las verificaciones de pagos existentes no sustituyen un recorrido real nuevo.

## Publicación y rollback

Esta tanda queda preparada y probada localmente; no se presenta como desplegada. Antes del despliegue:

1. Revisar el diff de los dos archivos de presentación; no incluir cambios de pagos o infraestructura ajenos.
2. Crear una release identificada por commit y conservar la imagen/ruta productiva vigente como rollback.
3. Construir con el procedimiento Docker existente y configurar el `RELEASE_ID` exacto. No cambiar `commerce.env`, volumen de PostgreSQL ni flags de cobro.
4. Comprobar salud y HTML/catálogo del candidato antes de dirigir tráfico. Después, repetir smoke HTTPS, 26 identidades/precios, bolsa en sesión aislada, canonical y fotos en el dominio oficial.
5. Si hay regresión, reponer la imagen web previa compatible con el mismo esquema. No revertir base, pedidos, pagos o reservas.

La activación del plan editorial, la recopilación de medidas y los experimentos de posicionamiento siguen separados de este release visual. No se modificaron cuentas sociales, campañas ni analítica externa.
