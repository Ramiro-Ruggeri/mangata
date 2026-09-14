# Footer, controles y publicación · 14/09/2026

## Alcance

- Footer con regreso a la colección, consulta de medidas y próximos drops por WhatsApp; navegación al proceso y preguntas de compra. Sin promociones, testimonios ni cifras de conversión inventados.
- Controles generales con radio de 4 px, iconos de apoyo, estados de foco/pulsación y movimiento discreto. Acciones de encabezado, bolsa, privacidad y recuperación de errores revisadas.
- Hover del storefront limitado a puntero fino. Respeto de `prefers-reduced-motion` en las nuevas reglas; ninguna librería de animación adicional.
- Eventos `footer_navigation`, `measurement_inquiry` y `drop_inquiry` sujetos al consentimiento existente. No se instaló un proveedor de analítica ni se afirma un aumento medido de ventas.

## Protección de productos

Sin cambios en `ProductCard`, `PDPClient.tsx` ni `product.css` durante esta pasada. Las tarjetas/fichas conservan sus botones; la única modificación de la ruta de producto es su URL pública para metadatos.

SHA-256 antes y después:

- `PDPClient.tsx`: `E29E7D123554CB8897FFEBE70256B8E80A886BFF331D7BDEBCFE5BB18BD40D3D`.
- `product.css`: `9EA6D71A80911DF5D5AA4D5C6C90027DE87B15EBA334A899DEEA48A71A254D7D`.
- Fragmento `ProductCard`: `047E84E7E95752D7EA9068403D4E786562F7C5857B5A694F82A0AD29228500AA`.
- Comparación DOM antes/después de los 16 controles de las 8 tarjetas: misma tipografía, padding, bordes, radios, colores y altura. Sumar: 46 px; ver detalle: 42 px.

## Verificación

- Anchos reales de viewport: 320, 360, 390, 430, 700, 768, 1024, 1366 y 1920 px. Sin desbordamiento horizontal, texto de enlaces del footer cortado ni controles fuera del encabezado. CTA del footer: 54 px de alto.
- A 390 × 844, el CTA vuelve a `#coleccion` con inicio a 80 px, conservando las 8 tarjetas y la selección.
- Búsqueda sin resultados y Escape: devuelve foco a Buscar. Menú móvil → Hablemos: cierra el modal y enfoca `#ayuda`.
- Bolsa: CTA de consulta de 54 px, visible a 390 × 844; control flotante oculto mientras está abierta. No se vació ni modificó la bolsa para probarlo.
- Navegación bidireccional comprobada: 4518 → 0 → 4518 px, sin recarga; foco al título al subir.
- Preferencias: apertura/cierre con Escape, aceptar y rechazar del mismo tamaño, control flotante oculto. No se amplió el banner compacto.
- Consola: sin warnings ni errores durante estas interacciones.
- 27 pruebas automáticas, lint y comprobación de tipos. El build de producción se vuelve a ejecutar antes de publicar.
- Limitación: esta matriz valida tamaños de navegador; no sustituye pruebas físicas de Safari/iOS, teclado virtual, DPR alto o evaluación de conversión con datos reales.

## Destino verificado y límites comerciales

El panel de Vercel identifica `ramiro-ruggeris-projects/mangata`, conectado a `Ramiro-Ruggeri/mangata`, rama productiva `main`, con dominio **https://mangata-store.vercel.app**. La dirección antigua `mangata-two.vercel.app` muestra otro sitio y no debe publicarse en metadatos ni enlaces del proyecto.

`getSiteUrl()` centraliza canonical, Open Graph, Organization, robots y sitemap; descarta el alias retirado incluso si una configuración antigua aún lo contiene. La variable de Vercel está tipada como secreto de sólo escritura: la interfaz no permitió convertirla a configuración pública; se canceló el cambio sin eliminar ni revelar variables. El guard de metadatos no configura pagos ni reemplaza la futura configuración comercial.

La primera comprobación del despliegue detectó el alias adicional `mangata.vercel.app` en canonical/OG procedente de la configuración heredada. También se normaliza hacia `mangata-store.vercel.app`, con prueba de regresión. Los futuros dominios personalizados y localhost siguen admitidos.

El despliegue de `4bced22aef0f480ca1f41eca52f896e8e5053b93` llegó a Ready/Production en Vercel. En la URL pública se verificaron el nuevo footer, sus enlaces, imágenes visibles cargadas, ausencia de overflow y alturas de cookies de 123 px (390 px de ancho) y 69 px (1366 px). El ajuste del alias adicional se publica como corrección posterior; la revisión final debe comprobar canonical/OG, robots, sitemap y ficha en esa nueva versión.

Se recuperó el historial Git de la copia ZIP sin sobrescribir el trabajo local. Las fotos originales siguen en `source-assets` (excluido de Git/despliegue) y en el historial remoto; la publicación utiliza sus derivados optimizados.

EverShop y los cobros siguen pendientes de configuración y pruebas. Se conserva el flujo de consulta por WhatsApp y el cierre seguro del checkout. Ver `COMMERCE-READINESS.md` y `RELEASE-CHECKLIST.md` antes de habilitar pagos. La publicación visual no acredita que el backend de stock esté integrado.
