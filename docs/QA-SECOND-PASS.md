# MANGATA · segunda pasada de calidad

14/09/2026. **Preparado para staging, con bloqueos de producción detallados.**

## Implementación

- Se mantuvo el diseño editorial y el stack instalado: Next 16.3.5, React 19.2.4, TypeScript, React Compiler, Tailwind 4, Framer Motion 13, Lucide, next/image y next/font. No se agregaron dependencias.
- Campaña cuadrada nueva, sin recorte destructivo ni deformación. El resultado real es 1254 × 1254, no 4K. Se conservaron ambas versiones y las fotografías originales de catálogo. Ver `CAMPAIGN-IDENTITY-QA.md` para el prompt, medidas y límite DPR.
- Símbolo auténtico compartido; favicon y Apple icon reducidos desde el original, no redibujados. La tipografía MANGATA de interfaz no se presenta como un vector aprobado.
- Control subir/regresar de 50 × 50 px, retorno por ancla, sin recarga, descarte por navegación manual/ruta y respeto de movimiento reducido.
- Registro único de overlays: búsqueda, menú, bolsa, zoom y preferencias. Scroll lock centralizado y foco restaurado sin competir con otro modal. Un enlace del menú devuelve el foco a la sección elegida. Un cierre mientras el agregado sigue pendiente dispone de fallback habilitado.
- Consentimiento explícito: sin analítica antes de autorizar, sin cola/replay, revocación selectiva, versión y vencimiento, fallback en memoria y preferencias en todas las rutas. El rechazo no bloquea la bolsa.
- Ajustes responsive, contraste de foco sobre papel, targets táctiles, motion compartido, bolsa desplazable en pantallas bajas, imágenes diferidas y `sizes` de portada móvil corregido.
- Hardening de endpoints: límites reales de lectura JSON, origen/MIME, HTTPS y redirects autenticados, no-store y logs sanitizados. No se simula un backend durable.

## Verificación automática

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` | Sin errores |
| `npm run typecheck` | Sin errores |
| `npm test` | 25/25: comercio 16, consentimiento 4, experiencia 5 |
| `npm run build` | Correcto; 16 rutas generadas/analizadas; compilación final 5,0 s y TypeScript 5,9 s |
| `npm audit --omit=dev --json` | 0 vulnerabilidades conocidas en dependencias productivas al revisar |

Los tests de comercio no ejecutan pagos reales. Los tests de privacidad instrumentan almacenamiento, eventos y solicitudes en un entorno simulado; verifican que no se genera medición sin permiso y que no se reproduce al aceptarlo. No equivalen a capturar toda la red de un despliegue externo.

## QA de navegador ejecutado

Navegador integrado, servidor `next start`, Windows, viewport emulado, sin throttling. No son pruebas en iPhone físico ni Safari. Se inspeccionaron imágenes y estados visuales en esta conversación, no sólo el código.

- Home: 320, 360, 390, 430, 768, 1024, 1280, 1440, 1920 y 2560 px. Se corrigió un desborde de 3 px en 320; repetición final: `scrollWidth = clientWidth = 305` (scrollbar de escritorio de 15 px). En el resto de anchos la primera revisión no mostró desborde. Capturas revisadas a 320, 430 y 1440.
- Ficha: 320, 360, 390, 430, 768, 1024, 1280, 1440 y 1920 px sin desborde. Barra móvil de 79 px; oculta en escritorio y ante cualquier modal. Captura revisada a 390 × 844.
- Bolsa: apertura, selección existente, agregado de Baggy Foil, eliminación, vacío y CTA deshabilitado. Se restauró la selección inicial —una unidad de Baggy Denim Custom— al finalizar. No se abrió WhatsApp ni se enviaron mensajes.
- Foco en bolsa: empieza en Cerrar; Shift+Tab lleva a Vaciar selección y Tab vuelve a Cerrar. Fondo inert, Escape y restitución de barra comprobados.
- Horizontal 844 × 390: bolsa dentro del viewport y desplazable (contenido 541 px), controles finales accesibles por scroll. Sin recorte fijo que bloquee pagar/consultar.
- Galería: dos fotos reales de Baggy Foil, zoom, ArrowRight, Escape, retorno al botón Ampliar foto; compra móvil oculta mientras abre el zoom. La ficha de Baggy Denim Custom conserva una sola vista, sin inventar fotos.
- Consentimiento: primer aviso no modal a 430, Configurar→Escape vuelve a Configurar; aceptar→reabrir muestra medición activada; rechazar/revocar→recargar mantiene desactivada, sin banner repetido. Se comprobó también al cambiar de home a ficha.
- Preferencias a 390 × 844: panel x=10, y=12, ancho=370, alto=820, scroll propio; compra y retorno ocultos. No hay superposición interactiva.
- Separación en ficha: barra de compra empieza en y=765; control de retorno termina en y=749: 16 px libres.
- Menú móvil: navegar a Cómo lo hacemos deja foco en `#manifiesto`, no en el header.
- Búsqueda: foco inicial en input, respuesta vacía para consulta sin coincidencias y Escape devuelve foco a Buscar una pieza.
- Filtro Accesorios devuelve 5 tarjetas y precios por transferencia visibles. Volver a Todas y Ver más piezas muestra 16 tarjetas.
- Retorno móvil estable: y=2743 → 0 → 2743, `#manifiesto` a 79,875 CSS px antes y después. Foco al subir en el h1 y al volver en la sección.
- Retorno con catálogo expandido: y=2108 → 0 → 2108, 16 tarjetas y filtro Todas conservados. PageDown manual desde arriba invalida el retorno anterior. Cambiar de ruta limpia ese estado.
- Consola revisada tras esos flujos: sin errores ni warnings.
- Smoke HTTP final: `/checkout/failure` 200 + noindex/nofollow, `/privacidad` 200 + noindex, ruta inexistente 404 + noindex; sitemap 200 sin checkout/privacidad. Todas esas respuestas incluyen `X-Content-Type-Options: nosniff`.

Una medición inicial de retorno ocurrió con un cambio de ancho durante la sesión; se descartó como comparación de coordenadas y se repitió con viewport estable. Las cifras anteriores corresponden a la repetición estable.

## Rendimiento medido — alcance exacto

Ejecutar `node scripts/measure-local-delivery.mjs` con el servidor productivo local iniciado. Medición final: 2026-09-14 19:05 UTC, Node v24.16.0, Windows, loopback, sin limitación de red/CPU; cuatro solicitudes por recurso. La primera muestra puede tener caché. La mediana corresponde a las tres siguientes.

| Recurso | Bytes del cuerpo | Primera TTFB | Mediana TTFB posterior |
| --- | ---: | ---: | ---: |
| Home HTML | 92705 | 202,7 ms | 12,7 ms |
| Ficha /producto/3 HTML | 35630 | 439,6 ms | 47,6 ms |
| Favicon 64 × 64 PNG | 2566 | 52,3 ms | 9,0 ms |
| Apple icon 180 × 180 PNG | 10845 | 14,4 ms | 6,7 ms |
| Campaña AVIF 640 × 640, q85 | 24955 | 367,1 ms | 5,3 ms |
| Campaña AVIF 1254 × 1254, q85 | 85797 | 10,2 ms | 6,7 ms |

Son tiempos de entrega local y tamaños de respuesta; el HTML se contabiliza decodificado. No representan peso total de página, rendering, velocidad de un celular, Lighthouse, LCP, INP ni CLS. No se declara aumento de conversión sin datos comparables.

## Verificaciones pendientes antes de producción

- DPR 2/3 y zoom real: el control disponible sólo emula ancho/alto. Los atajos de zoom ensayados no cambiaron `innerWidth` ni DPR; no se acredita una prueba al 200 %. Se documentó cobertura matemática del máster, no una inspección física ficticia.
- Safari/iOS y Android físicos, teclado virtual real, safe areas y orientación en equipos reales; movimiento reducido y lector de pantalla a nivel de sistema operativo.
- Primer banner junto a compra móvil y persistencia bloqueada: código/alturas y tests cubiertos; repetir la matriz completa con perfiles limpios y almacenamiento restringido en staging.
- Captura de red del hosting definitivo (incluidos scripts inyectados), Lighthouse/mobile throttling y métricas reales de campo. El repo no instala un recolector externo de analítica.
- EverShop, reservas/pedidos durables, handoff seguro, credenciales privadas, callbacks y pagos de prueba. La ausencia de estos servicios mantiene el CTA honesto de consulta por WhatsApp.
- Datos legales/comerciales de Emilia, proveedores, medidas/fotos faltantes, condiciones de entrega/cambios, stock y precios confirmados. `/privacidad` sigue noindex y declara datos pendientes.
- Dominio/canonical, staging noindex o protegido, WAF/timeouts, CSP completa probada, logs, alertas, backups y rollback. Ver `RELEASE-CHECKLIST.md` para acción concreta de cada bloqueo.

El disco de trabajo tiene poco espacio libre (aprox. 116 MiB en la última lectura). No se eliminaron fotos, archivos personales ni originales para completar las pruebas; liberar espacio antes de instalar nuevas dependencias o preparar otro entorno.

## Archivos principales

`src/components/{brand,experience,privacy,ui}/`, `src/components/PrivacyFooter.tsx`, `src/components/commerce/CartProvider.tsx`, `src/components/CartDrawer.tsx`, `src/components/PDPClient.tsx`, `src/components/storefront/`, `src/components/product/product.css`, `src/app/layout.tsx`, `src/app/globals.css`, iconos/rutas de error, `src/lib/{analytics,privacy,experience,commerce}/`, endpoints, tests, scripts y documentación de release.

No se desplegó la web ni se habilitaron cobros. Siguiente paso: configurar una instancia HTTPS de EverShop de staging y validar con Emilia catálogo/stock y el contrato comercial antes de probar el flujo completo.

## Ajuste posterior: aviso de cookies compacto

Pedido del 14/09/2026, basado en captura desktop. Cambios limitados a `ConsentProvider.tsx` (copy breve y orden de Configurar) y `privacy.css` (distribución responsive). No cambia finalidad, versión, persistencia ni lógica del consentimiento.

- Desktop 1366 px: altura anterior 139 px, nueva 69 px. También 69 px en 768, 1024, 1440 y 1920. Configurar y aceptar/rechazar quedan en la misma fila, con acciones de 44 px y aceptar/rechazar del mismo tamaño.
- Mobile 390/430: 194 → 123 px. Mobile 320: 221 → 136 px; en 360 queda 136 px. Texto de 12 px y botones de 44 px, sin partir etiquetas en 320 después del ajuste final de padding.
- Matriz 320, 360, 390, 430, 680, 681, 768, 1024, 1366, 1440 y 1920: sin desborde horizontal de página ni aviso.
- Ficha móvil 390 × 844 con primer aviso: banner y barra de compra se encuentran en y=721 sin solaparse; retorno separado 16 px de la barra. Repetido a 320 × 740: sin solapamiento ni desborde.
- Configurar → Escape restaura foco a Configurar. Rechazar cierra el aviso y devuelve `--consent-banner-height` a 0; la barra de compra vuelve al borde inferior. Consola sin errores/warnings.
- QA de primera visita en origen local separado `127.0.0.1`, sin borrar preferencias ni modificar la bolsa del origen `localhost`. Se restauró el viewport al terminar.
- `npm run lint`, 25/25 tests y build productivo con TypeScript correctos. No se publicó el cambio.
